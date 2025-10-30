import { X, ChevronDown, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import SettingsMenu from "./SettingsMenu";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileMenu = ({ isOpen, onClose }: MobileMenuProps) => {
  const [archivesOpen, setArchivesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Menu */}
      <div
        className={cn(
          "fixed left-0 top-0 h-full w-[80%] max-w-sm bg-background z-50 transition-transform duration-300 ease-out border-r border-border",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-foreground rounded-sm" />
            <span className="text-sm font-medium">Search</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>

        <nav className="p-6">
          <ul className="space-y-6">
            <li>
              <Link
                to="/catalog"
                className="text-lg font-bold tracking-tight hover:text-muted-foreground transition-colors"
                onClick={onClose}
              >
                CATALOG
              </Link>
            </li>
            <li>
              <Link
                to="/community"
                className="text-lg font-bold tracking-tight hover:text-muted-foreground transition-colors"
                onClick={onClose}
              >
                COMMUNITY
              </Link>
            </li>
            <li>
              <button
                className="flex items-center justify-between w-full text-lg font-bold tracking-tight hover:text-muted-foreground transition-colors"
                onClick={() => setArchivesOpen(!archivesOpen)}
              >
                ARCHIVES
                <ChevronDown
                  className={cn(
                    "h-5 w-5 transition-transform",
                    archivesOpen && "rotate-180"
                  )}
                />
              </button>
            </li>
            <li>
              <Link
                to="/about"
                className="text-lg font-bold tracking-tight hover:text-muted-foreground transition-colors"
                onClick={onClose}
              >
                ABOUT
              </Link>
            </li>
            <li>
              <button
                className="flex items-center gap-2 text-lg font-bold tracking-tight hover:text-muted-foreground transition-colors"
                onClick={() => {
                  setSettingsOpen(true);
                  onClose();
                }}
              >
                <Settings className="h-5 w-5" />
                SETTINGS
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <SettingsMenu isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
};

export default MobileMenu;
