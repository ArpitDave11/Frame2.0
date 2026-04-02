import ubsLogo from "figma:asset/00ac1239b9b421f7eee8b4e260132b1ac860676a.png";

export function Header() {
  return (
    <header className="w-full bg-white border-b border-gray-200">
      <div className="max-w-[1920px] mx-auto px-8 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <img 
            src={ubsLogo} 
            alt="UBS" 
            className="w-[83px] min-w-[83px] h-auto"
          />
          <span className="text-[0.8125rem] leading-4 font-light" style={{ fontFamily: 'Frutiger, Arial, Helvetica, sans-serif', color: 'var(--col-text-subtle)' }}>FRAME</span>
        </div>
        
        <nav className="flex items-center gap-8">
          <a 
            href="#" 
            className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
          >
            Products
          </a>
          <a 
            href="#" 
            className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
          >
            Services
          </a>
          <a 
            href="#" 
            className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
          >
            Insights
          </a>
          <a 
            href="#" 
            className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
          >
            About
          </a>
          <a 
            href="#" 
            className="text-gray-700 hover:text-gray-900 transition-colors text-sm font-medium"
          >
            Contact
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
            Login
          </button>
          <button className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors">
            Get Started
          </button>
        </div>
      </div>
    </header>
  );
}