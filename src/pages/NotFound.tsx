import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const currentYear = new Date().getFullYear();
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
        <a href="/" className="text-blue-500 hover:text-blue-700 underline">
          Return to Home
        </a>
      </div>
      <footer className="w-full text-center py-4 text-muted-foreground text-sm border-t mt-8">
        <img src="/watermark-logo.png" alt="SEARSv2 Logo" className="mx-auto mb-2 h-16 opacity-90" />
        &copy; Iowa State University & University at Buffalo {currentYear}
      </footer>
    </div>
  );
};

export default NotFound;
