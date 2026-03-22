"use client";

import CoreLanguageSwitcher from "@platform/core/ui/LanguageSwitcher";
import { useRouter, usePathname } from "@/i18n/navigation";

const LANGUAGES = [
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <CoreLanguageSwitcher
      languages={LANGUAGES}
      onSwitch={(locale) => router.replace(pathname, { locale })}
    />
  );
}
