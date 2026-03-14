import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import heroVideo from "@/assets/hero-video.mp4";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { GlobalTimer } from "@/components/GlobalTimer";
import { allPaymentLogos } from "@/components/payment/PaymentMethodSelector";

// Shipping method logos
import jneLogo from "@/assets/shipping/jne-new.jpg";

const Home = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[600px] md:h-[700px] bg-gradient-hero overflow-hidden">
        <div className="absolute inset-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover object-center"
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
        </div>
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Link to="/catalog">
            <Button
              size="lg"
              className="h-14 px-12 text-lg font-bold rounded-full bg-transparent border-2 border-white text-white hover:bg-white/10 backdrop-blur-sm transition-all hover:scale-105"
            >
              {t("home.shopButton")}
            </Button>
          </Link>
        </div>
      </section>

      {/* Global Timer Section */}
      <GlobalTimer />

      {/* Info Sections */}
      <section className="bg-foreground text-background">
        <Collapsible className="border-b border-background/20">
          <CollapsibleTrigger className="flex items-center justify-between w-full px-6 py-5 text-left">
            <h3 className="text-xl font-bold">{t("home.paymentMethods")}</h3>
            <ChevronDown className="h-5 w-5 transition-transform ui-expanded:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-6 pb-6">
            <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
              {allPaymentLogos.map((logo) => (
                <div
                  key={logo.alt}
                  className="flex items-center justify-center aspect-square bg-white rounded-lg p-2"
                >
                  <img
                    src={logo.src}
                    alt={logo.alt}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible className="border-b border-background/20">
          <CollapsibleTrigger className="flex items-center justify-between w-full px-6 py-5 text-left">
            <h3 className="text-xl font-bold">{t("home.shippingMethods")}</h3>
            <ChevronDown className="h-5 w-5 transition-transform ui-expanded:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-6 pb-6">
            <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
              <div className="flex items-center justify-center aspect-square bg-white rounded-lg p-2">
                <img src={jneLogo} alt="JNE Express" className="w-full h-full object-contain" loading="lazy" />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </section>
    </div>
  );
};

export default Home;
