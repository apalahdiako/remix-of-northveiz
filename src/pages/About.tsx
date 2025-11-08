import { Instagram } from "lucide-react";
import { SiTiktok } from "react-icons/si";
import { useTranslation } from "react-i18next";
import founderPhoto from "@/assets/founder-photo.png";
import logo from "@/assets/logo.png";

const About = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen flex flex-col pt-16">
      <div className="container px-6 py-12 max-w-4xl mx-auto flex-grow">
        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">
          {t("about.founderTitle")}
        </h1>
        
        {/* Founder Photo */}
        <div className="flex justify-center mb-8 md:mb-12">
          <div className="w-full max-w-sm md:max-w-md">
            <img 
              src={founderPhoto} 
              alt="Founder - Bayu Raja Syah" 
              className="w-full h-auto rounded-lg shadow-lg object-cover"
            />
          </div>
        </div>

        {/* Brand Logo */}
        <div className="flex justify-center mb-8 md:mb-12">
          <img 
            src={logo} 
            alt="NORTHVEIZ Logo" 
            className="w-32 h-32 md:w-40 md:h-40 object-contain"
          />
        </div>

        {/* Brand Story */}
        <div className="space-y-4 text-muted-foreground leading-relaxed text-center mb-12 md:mb-16">
          <p className="text-sm md:text-base">
            {t("about.brandStory")}
          </p>
        </div>

        {/* Social Media Section */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 tracking-wider">
            {t("about.socialMedia").toUpperCase()}
          </h2>
          
          <div className="flex justify-center items-center gap-8 md:gap-12">
            {/* Instagram */}
            <a
              href="https://www.instagram.com/northveiz?igsh=MWEwZzFpeHJzdzNhbg=="
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity group"
            >
              <Instagram className="w-10 h-10 md:w-12 md:h-12" />
              <span className="text-xs md:text-sm font-medium uppercase">Instagram</span>
            </a>

            {/* TikTok */}
            <a
              href="https://www.tiktok.com/@northveiz?_r=1&_t=ZS-913KuZQgX6g"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 hover:opacity-70 transition-opacity group"
            >
              <SiTiktok className="w-10 h-10 md:w-12 md:h-12" />
              <span className="text-xs md:text-sm font-medium uppercase">TikTok</span>
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center border-t">
        <p className="text-xs md:text-sm text-muted-foreground">
          {t("about.footer")}
        </p>
      </footer>
    </div>
  );
};

export default About;
