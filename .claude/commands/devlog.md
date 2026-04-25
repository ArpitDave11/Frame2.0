---
description: Append a devlog entry for the just-completed task
allowed-tools: Bash(git log:*), Bash(git rev-parse:*), Bash(git status:*), Read, Write
argument-hint: [task-summary]
---
Read .devlog-template.md, fill it in based on the current task ($ARGUMENTS), recent conversation, and `git log --oneline -10`. Append (do not overwrite) to docs/devlog/YYYY-MM-DD-{slug}.md. Update docs/devlog/README.md index.
