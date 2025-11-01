import { useState, useEffect } from "react";
import { X, Globe, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsMenu = ({ isOpen, onClose }: SettingsMenuProps) => {
  const { t, i18n } = useTranslation();
  const [deliveryCountry, setDeliveryCountry] = useState("Indonesia");
  const [language, setLanguage] = useState("English");
  const [currency, setCurrency] = useState("IDR - Indonesian Rupiah");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language");
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
  }, []);

  const handleSave = () => {
    // Save settings to localStorage
    localStorage.setItem("deliveryCountry", deliveryCountry);
    localStorage.setItem("language", language);
    localStorage.setItem("currency", currency);
    
    // Change i18n language based on selection
    const languageMap: { [key: string]: string } = {
      "Bahasa Indonesia": "id",
      "English": "en",
      "Bahasa Melayu": "ms"
    };
    
    const newLang = languageMap[language];
    if (newLang) {
      i18n.changeLanguage(newLang);
    }
    
    onClose();
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="bg-background">
        <DrawerHeader className="relative pb-4">
          <DrawerTitle className="text-left">{t("settings.title")}</DrawerTitle>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
          >
            <X className="h-6 w-6" />
            <span className="sr-only">Close</span>
          </button>
        </DrawerHeader>

        <div className="px-4 pb-8 space-y-6">
          {/* Deliver to */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("settings.deliverTo")}
            </label>
            <Select value={deliveryCountry} onValueChange={setDeliveryCountry}>
              <SelectTrigger className="w-full h-14 bg-background border-2 border-border rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Indonesia">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇮🇩</span>
                    <span>Indonesia</span>
                  </div>
                </SelectItem>
                <SelectItem value="United States">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇺🇸</span>
                    <span>United States</span>
                  </div>
                </SelectItem>
                <SelectItem value="Singapore">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇸🇬</span>
                    <span>Singapore</span>
                  </div>
                </SelectItem>
                <SelectItem value="Malaysia">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇲🇾</span>
                    <span>Malaysia</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("settings.language")}
            </label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full h-14 bg-background border-2 border-border rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bahasa Indonesia">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span>Bahasa Indonesia</span>
                  </div>
                </SelectItem>
                <SelectItem value="English">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span>English</span>
                  </div>
                </SelectItem>
                <SelectItem value="Bahasa Melayu">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span>Bahasa Melayu</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("settings.currency")}
            </label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-full h-14 bg-background border-2 border-border rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD - United States Dollar">
                  USD - United States Dollar
                </SelectItem>
                <SelectItem value="SGD - Singapore Dollar">
                  SGD - Singapore Dollar
                </SelectItem>
                <SelectItem value="MYR - Malaysian Ringgit">
                  MYR - Malaysian Ringgit
                </SelectItem>
                <SelectItem value="IDR - Indonesian Rupiah">
                  IDR - Indonesian Rupiah
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            className="w-full h-14 rounded-xl text-base font-semibold"
            size="lg"
          >
            {t("settings.save")}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default SettingsMenu;
