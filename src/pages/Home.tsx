import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroVideo from "@/assets/hero-video.mp4";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { GlobalTimer } from "@/components/GlobalTimer";

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
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 items-center">
              {/* E-Wallets & QR */}
              <div className="bg-background rounded p-3 flex items-center justify-center h-12">
                <span className="text-foreground font-bold text-xs">QRIS</span>
              </div>
              <div className="bg-background rounded p-3 flex items-center justify-center h-12">
                <span className="text-foreground font-bold text-xs">OVO</span>
              </div>
              <div className="bg-background rounded p-3 flex items-center justify-center h-12">
                <span className="text-foreground font-bold text-xs">ShopeePay</span>
              </div>
              <div className="bg-background rounded p-3 flex items-center justify-center h-12">
                <span className="text-foreground font-bold text-xs">Akulaku</span>
              </div>
              <div className="bg-background rounded p-3 flex items-center justify-center h-12">
                <span className="text-foreground font-bold text-xs">Alfamart</span>
              </div>
              <div className="bg-background rounded p-3 flex items-center justify-center h-12">
                <span className="text-foreground font-bold text-xs">Mandiri</span>
              </div>
              
              {/* Banks */}
              <div className="bg-background rounded p-3 flex items-center justify-center h-12">
                <span className="text-foreground font-bold text-xs">BRI</span>
              </div>
              <div className="bg-background rounded p-3 flex items-center justify-center h-12">
                <span className="text-foreground font-bold text-xs">BNI</span>
              </div>
              <div className="bg-background rounded p-3 flex items-center justify-center h-12">
                <span className="text-foreground font-bold text-xs">PermataBank</span>
              </div>
              <div className="bg-background rounded p-3 flex items-center justify-center h-12">
                <span className="text-foreground font-bold text-xs">PermataSyariah</span>
              </div>
              <div className="bg-background rounded p-3 flex items-center justify-center h-12">
                <span className="text-foreground font-bold text-xs">Danamon</span>
              </div>
              <div className="bg-background rounded p-3 flex items-center justify-center h-12">
                <span className="text-foreground font-bold text-xs">BSI</span>
              </div>
              
              {/* Cards */}
              <div className="bg-background rounded p-3 flex items-center justify-center h-12">
                <span className="text-foreground font-bold text-xs">CIMB Niaga</span>
              </div>
              <div className="bg-background rounded p-3 flex items-center justify-center h-12">
                <span className="text-foreground font-bold text-xs">VISA</span>
              </div>
              <div className="bg-background rounded p-3 flex items-center justify-center h-12">
                <span className="text-foreground font-bold text-xs">JCB</span>
              </div>
              <div className="bg-background rounded p-3 flex items-center justify-center h-12">
                <span className="text-foreground font-bold text-xs">MasterCard</span>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center max-w-md">
              <div className="bg-background rounded p-3 flex items-center justify-center h-12">
                <span className="text-foreground font-bold text-xs">JNE</span>
              </div>
              <div className="bg-background rounded p-3 flex items-center justify-center h-12">
                <span className="text-foreground font-bold text-xs">DHL</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </section>
    </div>
  );
};

export default Home;
