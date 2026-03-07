const Footer = () => {
  return (
    <footer className="border-t bg-background mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <span>
          &copy; {new Date().getFullYear()}{" "}
          <span className="font-medium text-foreground">PCB Assistant</span>
        </span>
        <span>
          Built by{" "}
          <a
            href="https://tarikul.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:text-primary transition-colors"
          >
            TARIKUL ISLAM
          </a>{" "}
          
        </span>
      </div>
    </footer>
  );
};

export default Footer;
