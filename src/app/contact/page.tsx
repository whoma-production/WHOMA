import { ContactPageShell } from "@/components/contact/contact-page-shell";
import { getPublicSiteConfig } from "@/lib/public-site";

export default function ContactPage(): JSX.Element {
  const site = getPublicSiteConfig();

  return (
    <ContactPageShell
      logoSubtitle={site.logoSubtitle}
      supportEmail={site.supportEmail}
    />
  );
}
