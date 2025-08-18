import { Instagram, MessageCircle, ExternalLink } from "lucide-react"

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border mt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Logo Section */}
        <div className="flex justify-center items-center mb-6">
          <div className="text-2xl font-bold text-primary">kamanime.xyz</div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border mb-8"></div>

        {/* A-Z List Section */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <p className="text-primary font-semibold text-sm">A-Z List</p>
          <p className="text-muted-foreground text-sm text-center">Searching anime ordered by alphabet name A to Z</p>
        </div>

        {/* Social Media Links */}
        <div className="flex justify-center items-center gap-6 mb-8">
          <a
            href="https://discord.gg/GBucEErX"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white transition-colors duration-200"
          >
            <MessageCircle size={18} />
            <span className="text-sm font-medium">Discord</span>
          </a>
          <a
            href="https://www.instagram.com/kamanime.xyz?igsh=NTc4MTIwNjQ2YQ=="
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#E4405F] via-[#F56040] to-[#FFDC80] hover:opacity-90 text-white transition-opacity duration-200"
          >
            <Instagram size={18} />
            <span className="text-sm font-medium">Instagram</span>
          </a>
        </div>

        {/* Disclaimer and Copyright */}
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            kamanime does not store any files on our server. We only link to media which is hosted on 3rd party
            services.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
            <p>© 2024 kamanime.xyz All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="/privacy" className="hover:text-primary transition-colors duration-200 flex items-center gap-1">
                Privacy Policy
                <ExternalLink size={12} />
              </a>
              <a href="/terms" className="hover:text-primary transition-colors duration-200 flex items-center gap-1">
                Terms of Service
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
              
