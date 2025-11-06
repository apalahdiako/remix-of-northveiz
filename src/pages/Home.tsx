import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroVideo from "@/assets/hero-video.mp4";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { GlobalTimer } from "@/components/GlobalTimer";

// Payment method logos
import qrisLogo from "@/assets/payment/qris.png";
import ovoLogo from "@/assets/payment/ovo.png";
import shopeepayLogo from "@/assets/payment/shopeepay.png";
import akulakuLogo from "@/assets/payment/akulaku.png";
import alfamartLogo from "@/assets/payment/alfamart.png";
import mandiriLogo from "@/assets/payment/mandiri.png";
import briLogo from "@/assets/payment/bri.png";
import bniLogo from "@/assets/payment/bni.png";
import permataLogo from "@/assets/payment/permata.png";
import danamonLogo from "@/assets/payment/danamon.png";
import bsiLogo from "@/assets/payment/bsi.png";
import cimbLogo from "@/assets/payment/cimb.png";
import visaLogo from "@/assets/payment/visa.png";
import jcbLogo from "@/assets/payment/jcb.png";
import mastercardLogo from "@/assets/payment/mastercard.png";

// Shipping method logos
import jneLogo from "@/assets/shipping/jne.png";
import dhlLogo from "@/assets/shipping/dhl.png";

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
            <div className="flex flex-col gap-6">
              {/* Row 1: E-Wallets & QR */}
              <div className="grid grid-cols-6 gap-6 items-center">
                <div className="flex items-center justify-center h-12">
                  <img src={qrisLogo} alt="QRIS" className="h-8 w-auto object-contain filter brightness-0 invert" />
                </div>
                <div className="flex items-center justify-center h-12">
                  <img src={ovoLogo} alt="OVO" className="h-8 w-auto object-contain filter brightness-0 invert" />
                </div>
                <div className="flex items-center justify-center h-12">
                  <img src={shopeepayLogo} alt="ShopeePay" className="h-8 w-auto object-contain filter brightness-0 invert" />
                </div>
                <div className="flex items-center justify-center h-12">
                  <img src={akulakuLogo} alt="Akulaku" className="h-10 w-auto object-contain filter brightness-0 invert" />
                </div>
                <div className="flex items-center justify-center h-12">
                  <img src={alfamartLogo} alt="Alfamart" className="h-6 w-auto object-contain filter brightness-0 invert" />
                </div>
                <div className="flex items-center justify-center h-12">
                  <img src={mandiriLogo} alt="Mandiri" className="h-6 w-auto object-contain filter brightness-0 invert" />
                </div>
              </div>
              
              {/* Row 2: Banks */}
              <div className="grid grid-cols-6 gap-6 items-center">
                <div className="flex items-center justify-center h-12">
                  <img src={briLogo} alt="BRI" className="h-8 w-auto object-contain filter brightness-0 invert" />
                </div>
                <div className="flex items-center justify-center h-12">
                  <img src={bniLogo} alt="BNI" className="h-8 w-auto object-contain filter brightness-0 invert" />
                </div>
                <div className="flex items-center justify-center h-12">
                  <img src={permataLogo} alt="PermataBank" className="h-7 w-auto object-contain filter brightness-0 invert" />
                </div>
                <div className="flex items-center justify-center h-12">
                  <img src={permataLogo} alt="PermataBank Syariah" className="h-7 w-auto object-contain filter brightness-0 invert" />
                </div>
                <div className="flex items-center justify-center h-12">
                  <img src={danamonLogo} alt="Danamon" className="h-6 w-auto object-contain filter brightness-0 invert" />
                </div>
                <div className="flex items-center justify-center h-12">
                  <img src={bsiLogo} alt="BSI" className="h-10 w-auto object-contain filter brightness-0 invert" />
                </div>
              </div>
              
              {/* Row 3: Cards */}
              <div className="grid grid-cols-6 gap-6 items-center">
                <div className="flex items-center justify-center h-12">
                  <img src={cimbLogo} alt="CIMB Niaga" className="h-8 w-auto object-contain filter brightness-0 invert" />
                </div>
                <div className="flex items-center justify-center h-12">
                  <img src={visaLogo} alt="VISA" className="h-5 w-auto object-contain filter brightness-0 invert" />
                </div>
                <div className="flex items-center justify-center h-12">
                  <img src={jcbLogo} alt="JCB" className="h-10 w-auto object-contain filter brightness-0 invert" />
                </div>
                <div className="flex items-center justify-center h-12">
                  <img src={mastercardLogo} alt="MasterCard" className="h-10 w-auto object-contain filter brightness-0 invert" />
                </div>
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
            <div className="flex gap-12 items-center">
              <div className="flex items-center justify-center h-12">
                <img src={jneLogo} alt="JNE Express" className="h-10 w-auto object-contain filter brightness-0 invert" />
              </div>
              <div className="flex items-center justify-center h-12">
                <img src={dhlLogo} alt="DHL" className="h-8 w-auto object-contain filter brightness-0 invert" />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </section>
    </div>
  );
};

export default Home;
