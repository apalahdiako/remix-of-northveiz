import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroVideo from "@/assets/hero-video.mp4";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { GlobalTimer } from "@/components/GlobalTimer";

// Payment method logos
import qrisLogo from "@/assets/payment/qris-new.jpg";
import alfamartLogo from "@/assets/payment/alfamart-new.jpg";
import indomaretLogo from "@/assets/payment/indomaret.jpg";
import akulakuLogo from "@/assets/payment/akulaku-new.jpg";
import shopeepayLogo from "@/assets/payment/shopeepay-new.jpg";
import ovoLogo from "@/assets/payment/ovo-new.jpg";
import briLogo from "@/assets/payment/bri-new.jpg";
import bniLogo from "@/assets/payment/bni-new.jpg";
import bcaLogo from "@/assets/payment/bca.jpg";


// Shipping method logos
import jneLogo from "@/assets/shipping/jne-new.jpg";

const Home = () => {
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
              className="h-14 px-12 text-lg font-bold rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all hover:scale-105"
            >
              SHOP HERE
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
            <h3 className="text-xl font-bold">Metode Pembayaran</h3>
            <ChevronDown className="h-5 w-5 transition-transform ui-expanded:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-6 pb-6">
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4 items-center">
              <div className="flex items-center justify-center p-2">
                <img src={qrisLogo} alt="QRIS" className="h-10 w-auto object-contain" />
              </div>
              <div className="flex items-center justify-center p-2">
                <img src={ovoLogo} alt="OVO" className="h-10 w-auto object-contain" />
              </div>
              <div className="flex items-center justify-center p-2">
                <img src={shopeepayLogo} alt="ShopeePay" className="h-10 w-auto object-contain" />
              </div>
              <div className="flex items-center justify-center p-2">
                <img src={akulakuLogo} alt="Akulaku" className="h-10 w-auto object-contain" />
              </div>
              <div className="flex items-center justify-center p-2">
                <img src={alfamartLogo} alt="Alfamart" className="h-10 w-auto object-contain" />
              </div>
              <div className="flex items-center justify-center p-2">
                <img src={indomaretLogo} alt="Indomaret" className="h-10 w-auto object-contain" />
              </div>
              <div className="flex items-center justify-center p-2">
                <img src={briLogo} alt="BRI" className="h-10 w-auto object-contain" />
              </div>
              <div className="flex items-center justify-center p-2">
                <img src={bniLogo} alt="BNI" className="h-10 w-auto object-contain" />
              </div>
              <div className="flex items-center justify-center p-2">
                <img src={bcaLogo} alt="BCA" className="h-10 w-auto object-contain" />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible className="border-b border-background/20">
          <CollapsibleTrigger className="flex items-center justify-between w-full px-6 py-5 text-left">
            <h3 className="text-xl font-bold">Metode Pengiriman</h3>
            <ChevronDown className="h-5 w-5 transition-transform ui-expanded:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-6 pb-6">
            <div className="flex items-center">
              <div className="flex items-center justify-center p-2 w-32">
                <img src={jneLogo} alt="JNE Express" className="w-full h-auto object-contain" />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </section>
    </div>
  );
};

export default Home;
