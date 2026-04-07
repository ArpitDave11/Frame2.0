# Securing Azure OpenAI keys for a React app on AKS

**A server-side proxy is the only safe pattern for browser-based apps** — and the simplest implementation is a ~45-line Node.js sidecar that uses `DefaultAzureCredential` to authenticate, eliminating the need to fetch API keys from Key Vault entirely. Azure OpenAI supports Entra ID token-based authentication via RBAC, which means you can skip Key Vault for the API key altogether and let the proxy acquire short-lived tokens automatically. If you must use API keys, a sidecar proxy fetching from Key Vault at startup requires changing just 4–5 files and zero infrastructure beyond what you already have.

This report evaluates three approaches in order of simplicity, provides production-ready code for each, and answers every critical question about authentication, Helm configuration, secret rotation, and CORS.

---

## Why browser apps can never hold API keys

This point is non-negotiable and worth stating clearly before diving into solutions. **Every byte of JavaScript shipped to a browser is public.** Vite's `import.meta.env.VITE_*` variables are inlined into the built bundle — they appear in plain text in the minified JS files. `localStorage`, `sessionStorage`, and cookies are all accessible via DevTools. The Network tab exposes every HTTP header, including `api-key` and `Authorization`. Source maps, even when excluded from production, can be reconstructed. Obfuscation is cosmetic, not security.

The only architecture that keeps secrets secret is one where the API key never leaves the server:

```
Browser → Server-Side Proxy (holds key) → Azure OpenAI
```

All three approaches below implement this pattern. They differ only in how secrets reach the proxy and how the proxy is deployed.

---

## The game-changing shortcut: token-based auth eliminates Key Vault

Before examining the three approaches, consider this: **Azure OpenAI fully supports Microsoft Entra ID (AAD) token-based authentication**. Instead of storing an API key in Key Vault and fetching it at runtime, you can assign the **`Cognitive Services OpenAI User`** RBAC role to your Service Principal and let `DefaultAzureCredential` acquire short-lived tokens automatically. Tokens refresh every hour without manual intervention, and there's no key to rotate, leak, or store.

```bash
# One-time setup: grant your SPN access to Azure OpenAI
az role assignment create \
  --role "Cognitive Services OpenAI User" \
  --assignee <spn-object-id> \
  --scope /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/<openai-resource>
```

This transforms the sidecar proxy from "fetch key from Key Vault, inject as header" to "acquire token automatically, authenticate natively." The proxy code shrinks, Key Vault is optional (useful only for storing the endpoint URL as configuration), and secret rotation becomes a non-issue. The code for this approach is shown in Approach 1 below.

---

## Approach 1: Node.js sidecar proxy (recommended)

This is the simplest, most self-contained option. A lightweight Express container runs alongside the nginx container serving your React app. Both share the pod's network namespace, so the frontend calls `localhost:3001` (or, better, nginx reverse-proxies to it).

### The proxy code — 45 lines

**`sidecar-proxy/server.js`**

```javascript
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

const app = express();
const PORT = process.env.PORT || 3001;

async function main() {
  const credential = new DefaultAzureCredential();
  const kvUrl = process.env.KEY_VAULT_URL;
  const kvClient = new SecretClient(kvUrl, credential);

  const endpointSecret = await kvClient.getSecret(process.env.SECRET_NAME_ENDPOINT || 'azure-openai-endpoint');
  const apiKeySecret   = await kvClient.getSecret(process.env.SECRET_NAME_API_KEY  || 'azure-openai-api-key');
  const OPENAI_ENDPOINT = endpointSecret.value;
  const OPENAI_API_KEY  = apiKeySecret.value;

  console.log(`Secrets loaded. Proxying to: ${OPENAI_ENDPOINT}`);

  app.use(cors({ origin: true, credentials: true }));
  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/openai', createProxyMiddleware({
    target: OPENAI_ENDPOINT,
    changeOrigin: true,
    pathRewrite: { '^/api/openai': '/openai' },
    on: {
      proxyReq: (proxyReq) => {
        proxyReq.setHeader('api-key', OPENAI_API_KEY);
        proxyReq.removeHeader('authorization');
      },
    },
  }));

  app.listen(PORT, '0.0.0.0', () =>
    console.log(`Sidecar proxy listening on port ${PORT}`)
  );
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
```

**`sidecar-proxy/package.json`**

```json
{
  "name": "aoai-sidecar-proxy",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": { "start": "node server.js" },
  "dependencies": {
    "express": "^4.21.0",
    "cors": "^2.8.5",
    "http-proxy-middleware": "^3.0.0",
    "@azure/identity": "^4.5.0",
    "@azure/keyvault-secrets": "^4.9.0"
  }
}
```

If you opt for **token-based auth** (no Key Vault needed for the API key), the proxy simplifies further — replace the Key Vault fetch with `getBearerTokenProvider` from `@azure/identity`:

```javascript
const { DefaultAzureCredential, getBearerTokenProvider } = require('@azure/identity');
const { AzureOpenAI } = require('openai');
const express = require('express');

const app = express();
app.use(express.json());

const credential = new DefaultAzureCredential();
const tokenProvider = getBearerTokenProvider(credential, 'https://cognitiveservices.azure.com/.default');

const client = new AzureOpenAI({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  azureADTokenProvider: tokenProvider,
  apiVersion: '2024-10-21',
});

app.post('/api/chat', async (req, res) => {
  try {
    const completion = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o',
      messages: req.body.messages,
    });
    res.json(completion);
  } catch (error) {
    console.error('OpenAI error:', error.message);
    res.status(500).json({ error: 'Failed to get completion' });
  }
});

app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
app.listen(3001, () => console.log('Proxy running on :3001'));
```

### Dockerfile for the sidecar

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM node:22-alpine
WORKDIR /app
RUN addgroup -S proxy && adduser -S proxy -G proxy
COPY --from=build /app/node_modules ./node_modules
COPY server.js package.json ./
USER proxy
EXPOSE 3001
ENV PORT=3001 NODE_ENV=production
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s \
  CMD wget -qO- http://localhost:3001/healthz || exit 1
CMD ["node", "server.js"]
```

### Helm chart changes

**Add to `values.yaml`:**

```yaml
sidecar:
  enabled: true
  image:
    repository: myregistry.azurecr.io/aoai-sidecar-proxy
    tag: "1.0.0"
    pullPolicy: IfNotPresent
  port: 3001
  env:
    KEY_VAULT_URL: "https://akveus2devdmeshdh01.vault.azure.net"
    SECRET_NAME_ENDPOINT: "azure-openai-endpoint"
    SECRET_NAME_API_KEY: "azure-openai-api-key"
  resources:
    requests:
      cpu: 50m
      memory: 64Mi
    limits:
      cpu: 200m
      memory: 128Mi
  azureCredentialsSecret: azure-sp-credentials
```

**Add the sidecar container in `templates/deployment.yaml`** inside the `containers` array:

```yaml
{{- if .Values.sidecar.enabled }}
- name: openai-proxy
  image: "{{ .Values.sidecar.image.repository }}:{{ .Values.sidecar.image.tag }}"
  imagePullPolicy: {{ .Values.sidecar.image.pullPolicy }}
  ports:
    - name: proxy
      containerPort: {{ .Values.sidecar.port }}
  env:
    {{- range $key, $value := .Values.sidecar.env }}
    - name: {{ $key }}
      value: {{ $value | quote }}
    {{- end }}
    - name: PORT
      value: {{ .Values.sidecar.port | quote }}
    - name: AZURE_CLIENT_ID
      valueFrom:
        secretKeyRef:
          name: {{ .Values.sidecar.azureCredentialsSecret }}
          key: clientId
    - name: AZURE_TENANT_ID
      valueFrom:
        secretKeyRef:
          name: {{ .Values.sidecar.azureCredentialsSecret }}
          key: tenantId
    - name: AZURE_CLIENT_SECRET
      valueFrom:
        secretKeyRef:
          name: {{ .Values.sidecar.azureCredentialsSecret }}
          key: clientSecret
  resources:
    {{- toYaml .Values.sidecar.resources | nindent 12 }}
  livenessProbe:
    httpGet:
      path: /healthz
      port: {{ .Values.sidecar.port }}
    initialDelaySeconds: 15
    periodSeconds: 20
  readinessProbe:
    httpGet:
      path: /healthz
      port: {{ .Values.sidecar.port }}
    initialDelaySeconds: 5
    periodSeconds: 10
{{- end }}
```

### Eliminating CORS via nginx reverse proxy

Rather than dealing with CORS (the browser sees port 80 for the app and port 3001 for the proxy as different origins), add a `location` block to the nginx config serving your React app so everything goes through port 80:

```nginx
server {
    listen 80;
    server_name _;

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    location /api/openai/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 120s;
        proxy_buffering off;  # Required for SSE streaming
    }
}
```

With this, the React app uses relative URLs (`/api/openai/...`) — no port, no CORS, no environment-specific configuration.

### React frontend change (minimal)

```typescript
// Before (INSECURE — key exposed in browser):
const res = await fetch('https://myresource.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21', {
  headers: { 'api-key': 'EXPOSED_KEY' },  // visible in DevTools
  ...
});

// After (SECURE — key stays server-side):
const res = await fetch('/api/openai/deployments/gpt-4o/chat/completions?api-version=2024-10-21', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages }),
  // No api-key header — the sidecar injects it
});
```

### Approach 1 assessment

**Files changed: 4–5** (server.js, Dockerfile, package.json, values.yaml, deployment.yaml template). **React changes: one line** — swap the base URL to `/api/openai/`. The sidecar consumes roughly **50m CPU and 64Mi RAM**, negligible next to the nginx container. Cold start adds 1–3 seconds for the Key Vault fetch, handled gracefully by readiness probes. The main limitation is that secrets are cached in memory at startup; for rotation without pod restart, add a `setInterval` to refetch every 30 minutes (code shown in the rotation section below).

---

## Approach 2: CSI driver mounts secrets, nginx proxies them

The **Azure Key Vault Provider for Secrets Store CSI Driver** is an official AKS add-on that mounts Key Vault secrets as files inside the pod. This is more Kubernetes-native than the sidecar pattern, but for a React frontend, **it still requires an nginx proxy** — the CSI driver gets secrets into the container, not into the browser.

### Enable the add-on

```bash
az aks enable-addons \
  --addons azure-keyvault-secrets-provider \
  --name myAKSCluster \
  --resource-group myResourceGroup \
  --enable-secret-rotation \
  --rotation-poll-interval 2m
```

Grant the add-on's managed identity access to Key Vault:

```bash
KV_IDENTITY_CLIENT_ID=$(az aks show \
  --name myAKSCluster --resource-group myResourceGroup \
  --query addonProfiles.azureKeyvaultSecretsProvider.identity.clientId -o tsv)

az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee $KV_IDENTITY_CLIENT_ID \
  --scope /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/akveus2devdmeshdh01
```

### SecretProviderClass YAML

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: azure-openai-secrets
spec:
  provider: azure
  parameters:
    useVMManagedIdentity: "true"
    userAssignedIdentityID: "<KV_IDENTITY_CLIENT_ID>"
    keyvaultName: "akveus2devdmeshdh01"
    tenantId: "<TENANT_ID>"
    objects: |
      array:
        - |
          objectName: openai-endpoint
          objectType: secret
        - |
          objectName: openai-api-key
          objectType: secret
```

### Deployment with CSI volume mount

```yaml
spec:
  containers:
    - name: nginx
      image: myregistry.azurecr.io/react-frontend:latest
      ports:
        - containerPort: 8080
      command: ["/bin/sh", "/app/entrypoint.sh"]
      volumeMounts:
        - name: secrets-store-inline
          mountPath: "/mnt/secrets-store"
          readOnly: true
  volumes:
    - name: secrets-store-inline
      csi:
        driver: secrets-store.csi.k8s.io
        readOnly: true
        volumeAttributes:
          secretProviderClass: "azure-openai-secrets"
```

### nginx.conf.template with envsubst

The nginx container reads secrets from the mounted files at startup and uses `envsubst` to inject them into the proxy configuration:

```nginx
server {
    listen 8080;
    server_name _;

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    location /api/openai/ {
        proxy_pass ${OPENAI_ENDPOINT}/openai/;
        proxy_set_header api-key "${OPENAI_API_KEY}";
        proxy_set_header Host "${OPENAI_HOST}";
        proxy_set_header Authorization "";
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_read_timeout 120s;
    }

    location /healthz {
        return 200 'ok';
        add_header Content-Type text/plain;
    }
}
```

**`entrypoint.sh`** reads the CSI-mounted files and runs `envsubst`:

```bash
#!/bin/sh
set -e
export OPENAI_ENDPOINT=$(cat /mnt/secrets-store/openai-endpoint | tr -d '[:space:]')
export OPENAI_API_KEY=$(cat /mnt/secrets-store/openai-api-key | tr -d '[:space:]')
export OPENAI_HOST=$(echo "$OPENAI_ENDPOINT" | sed 's|https\?://||' | sed 's|/.*||')

envsubst '${OPENAI_ENDPOINT} ${OPENAI_API_KEY} ${OPENAI_HOST}' \
  < /app/nginx.conf.template \
  > /etc/nginx/nginx.conf

exec nginx -g 'daemon off;'
```

### Approach 2 assessment

**Files changed: 4–5** (SecretProviderClass YAML, deployment.yaml, nginx.conf.template, entrypoint.sh, Dockerfile). **React changes: one line** — same URL swap. The key advantage is **automatic secret rotation**: the CSI driver polls Key Vault every 2 minutes by default and updates the mounted files. However, nginx reads those files only at startup — to pick up rotated secrets, you'd need either a pod restart or the OpenResty/Lua variant that re-reads files at request time. The add-on must be enabled cluster-wide, which requires AKS admin permissions. No additional containers run (the CSI driver is a DaemonSet managed by AKS).

---

## Approach 3: init container fetches secrets once at startup

This is the most portable approach — it works on any Kubernetes cluster, not just AKS. An init container runs before the main container, authenticates to Key Vault, writes secrets to a shared in-memory volume, then exits.

### Init container script (Azure CLI)

```bash
#!/bin/sh
set -e
az login --service-principal \
  --username "$AZURE_CLIENT_ID" \
  --password "$AZURE_CLIENT_SECRET" \
  --tenant "$AZURE_TENANT_ID" --output none

az keyvault secret show --vault-name akveus2devdmeshdh01 \
  --name openai-endpoint --query value -o tsv > /secrets/openai-endpoint
az keyvault secret show --vault-name akveus2devdmeshdh01 \
  --name openai-api-key --query value -o tsv > /secrets/openai-api-key
```

### Deployment YAML

```yaml
spec:
  initContainers:
    - name: fetch-secrets
      image: mcr.microsoft.com/azure-cli:latest
      command: ["/bin/sh", "/scripts/fetch-secrets.sh"]
      env:
        - name: AZURE_CLIENT_ID
          valueFrom: { secretKeyRef: { name: azure-spn-credentials, key: client-id } }
        - name: AZURE_CLIENT_SECRET
          valueFrom: { secretKeyRef: { name: azure-spn-credentials, key: client-secret } }
        - name: AZURE_TENANT_ID
          valueFrom: { secretKeyRef: { name: azure-spn-credentials, key: tenant-id } }
      volumeMounts:
        - name: secrets-volume
          mountPath: /secrets
        - name: scripts
          mountPath: /scripts
  containers:
    - name: nginx
      image: myregistry.azurecr.io/react-frontend:latest
      command: ["/bin/sh", "/app/entrypoint.sh"]
      volumeMounts:
        - name: secrets-volume
          mountPath: /secrets
          readOnly: true
  volumes:
    - name: secrets-volume
      emptyDir:
        medium: Memory    # tmpfs — secrets never touch disk
        sizeLimit: 1Mi
    - name: scripts
      configMap:
        name: fetch-secrets-script
        defaultMode: 0755
```

The main container uses the **same `entrypoint.sh` and `nginx.conf.template`** as Approach 2 — it reads `/secrets/openai-endpoint` and `/secrets/openai-api-key` instead of `/mnt/secrets-store/`. For a smaller init container (~100MB vs ~700MB for azure-cli), use a Python script with `azure-identity` and `azure-keyvault-secrets` on `python:3.12-alpine`.

### Approach 3 assessment

**Files changed: 5–6** (deployment.yaml, configmap for script, K8s secret for SPN credentials, nginx.conf.template, entrypoint.sh, Dockerfile). **React changes: one line.** The init container adds **5–10 seconds** of startup latency (az login + fetch). The `azure-cli` image is **~700MB** — a Python SDK image on Alpine is **~100MB**. No automatic rotation; secrets are fetched once and baked into nginx.conf. Most portable: works on EKS, GKE, or any vanilla Kubernetes.

---

## How SPN authentication works inside an AKS pod

`DefaultAzureCredential` from the `@azure/identity` SDK tries credentials in a defined chain. Inside an AKS pod, the two relevant methods are:

**EnvironmentCredential** (simplest for your SPN scenario): Set `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_CLIENT_SECRET` as environment variables in the pod (sourced from a Kubernetes Secret). `DefaultAzureCredential` picks them up automatically as the first credential in the chain. No additional AKS configuration needed.

**WorkloadIdentityCredential** (more secure, recommended for production): Uses Kubernetes Service Account Token Volume Projection and OIDC federation. No client secret is stored anywhere — the pod gets a projected JWT that's exchanged for an Entra ID token. Setup requires enabling the OIDC issuer on AKS, creating a federated identity credential on the SPN or managed identity, annotating a Kubernetes ServiceAccount with `azure.workload.identity/client-id`, and labeling the pod with `azure.workload.identity/use: "true"`.

**Pod Identity (aad-pod-identity) is deprecated** — it was archived in September 2023 and receives security patches only through September 2025. Workload Identity is the official replacement.

**Recommendation for your scenario**: Start with EnvironmentCredential (3 env vars from an existing K8s Secret) for immediate results. Plan a migration to Workload Identity for production, which eliminates the client secret entirely.

---

## Secret rotation without downtime

Three strategies, ordered by simplicity:

**Periodic refetch in the proxy** (Approach 1 only). Add a timer that re-fetches secrets from Key Vault every 30 minutes. The proxy continues serving requests with cached values while refreshing in the background. If a refresh fails, the old values remain active:

```javascript
let secretCache = {};
const REFRESH_INTERVAL = 30 * 60 * 1000;

async function refreshSecrets() {
  try {
    const [ep, key] = await Promise.all([
      kvClient.getSecret('azure-openai-endpoint'),
      kvClient.getSecret('azure-openai-api-key'),
    ]);
    secretCache = { endpoint: ep.value, apiKey: key.value };
    console.log('Secrets refreshed');
  } catch (err) {
    console.error('Refresh failed, using cached values:', err.message);
  }
}

await refreshSecrets();
setInterval(refreshSecrets, REFRESH_INTERVAL);
```

**CSI driver autorotation** (Approach 2). The driver polls Key Vault every 2 minutes by default and updates mounted files. Combined with OpenResty's `init_by_lua_block` reading files at startup, or an inotify watcher triggering nginx reload, you get near-zero-downtime rotation.

**Token-based auth** (best approach). If you use Managed Identity / SPN with `getBearerTokenProvider`, tokens auto-refresh every hour with no application logic. Secret rotation is a non-concern because there are no long-lived secrets.

---

## Azure APIM as an alternative to custom proxy code

Azure API Management can serve as a fully managed proxy, but **it's overkill for a single frontend calling one OpenAI endpoint**. APIM shines when you need rate limiting across multiple consumers, subscription key management, multi-region load balancing across OpenAI backends, or centralized logging and analytics.

The APIM policy to inject an API key from Key Vault is straightforward:

```xml
<inbound>
  <set-header name="api-key" exists-action="override">
    <value>{{openai-api-key}}</value>  <!-- Named Value backed by Key Vault -->
  </set-header>
</inbound>
```

APIM can also use Managed Identity directly, eliminating API keys entirely:

```xml
<inbound>
  <authentication-managed-identity resource="https://cognitiveservices.azure.com"
    output-token-variable-name="msi-access-token" />
  <set-header name="Authorization" exists-action="override">
    <value>@("Bearer " + (string)context.Variables["msi-access-token"])</value>
  </set-header>
</inbound>
```

**Cost consideration**: APIM Developer tier runs **~$50/month**, Standard tier **~$700/month**. The Consumption tier is pay-per-call at ~$3.50 per million calls. For a development environment with a single SPN and one frontend, the 45-line Express proxy costs nothing beyond compute resources you're already paying for.

---

## Head-to-head comparison of all approaches

| Factor | Sidecar proxy | CSI driver + nginx | Init container + nginx | APIM |
|---|---|---|---|---|
| **Complexity** | Low | Medium | Medium | Medium-High |
| **Files to change** | 4–5 | 4–5 | 5–6 | 0 code, APIM config |
| **Secret rotation** | Timer-based or token-based | Auto (2min polling) | Pod restart only | Auto via Named Values |
| **Extra infrastructure** | None | AKS add-on (cluster-wide) | None | APIM instance |
| **Portability** | Any K8s | AKS only | Any K8s | Azure only |
| **Startup latency** | 1–3s (KV fetch) | Minimal | 5–10s (az login) | N/A |
| **Runtime overhead** | ~50m CPU, 64Mi RAM | None (nginx only) | None (nginx only) | Managed |
| **React code changes** | URL swap only | URL swap only | URL swap only | URL swap only |
| **Monthly cost** | $0 extra | $0 extra | $0 extra | $50–700+ |
| **Token-based auth** | Yes (eliminates KV) | No (nginx can't do AAD) | No (nginx can't do AAD) | Yes (built-in) |

## Conclusion

The **sidecar proxy with token-based Entra ID authentication** is the strongest recommendation for this scenario. It eliminates Key Vault dependency for the API key entirely, requires the least code (~30 lines), handles token refresh automatically, and adds negligible overhead. The only setup is a single `az role assignment create` command and deploying the sidecar container.

If organizational policy requires API keys rather than token-based auth, the sidecar proxy with Key Vault fetch (Approach 1 with `@azure/keyvault-secrets`) is the next best option — it's fully self-contained, requires no cluster-wide add-ons, and the proxy code is small enough to audit in minutes. Add the CSI driver (Approach 2) only if you need automatic secret rotation without pod restarts and are willing to accept the AKS add-on dependency. Reserve APIM for production environments with multiple consumers or when you need managed rate limiting and analytics.

Regardless of approach, the critical architectural invariant remains: **the API key or token must live exclusively in the server-side proxy process, never in any browser-accessible artifact** — not in the JavaScript bundle, not in network requests visible to DevTools, not in any storage API. The proxy pattern enforces this by design.
