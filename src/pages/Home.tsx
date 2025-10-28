import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroVideo from "@/assets/hero-video.mp4";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

      {/* Info Sections */}
      <section className="bg-foreground text-background">
        <Collapsible className="border-b border-background/20">
          <CollapsibleTrigger className="flex items-center justify-between w-full px-6 py-5 text-left">
            <h3 className="text-xl font-bold">Payment Method</h3>
            <ChevronDown className="h-5 w-5 transition-transform ui-expanded:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-6 pb-5">
            <p className="text-background/80">
              We accept various payment methods including credit cards, debit cards, and digital wallets for your convenience.
            </p>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible className="border-b border-background/20">
          <CollapsibleTrigger className="flex items-center justify-between w-full px-6 py-5 text-left">
            <h3 className="text-xl font-bold">Shipment Method</h3>
            <ChevronDown className="h-5 w-5 transition-transform ui-expanded:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-6 pb-5">
            <p className="text-background/80">
              Fast and reliable shipping options available. Track your order from our warehouse to your doorstep.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </section>
    </div>
  );
};

export default Home;
