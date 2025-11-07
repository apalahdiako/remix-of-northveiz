import { useTranslation } from "react-i18next";

const Community = () => {
  const { t } = useTranslation();
  
  return (
    <div className="container px-6 py-8">
      <h1 className="text-3xl font-bold mb-4">{t("community.title")}</h1>
      <p className="text-muted-foreground">{t("community.comingSoon")}</p>
    </div>
  );
};

export default Community;
