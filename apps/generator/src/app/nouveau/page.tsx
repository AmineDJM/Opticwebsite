import { requirePlatform } from "../../server/session.js";
import { PRESET_LABELS, FEATURE_LABELS, DEFAULT_FEATURES } from "@optic/config";
import { CreateWizard } from "../../components/create-wizard.js";

export const dynamic = "force-dynamic";

export default async function NewWebsitePage() {
  await requirePlatform();
  return (
    <CreateWizard
      presets={Object.entries(PRESET_LABELS).map(([value, label]) => ({ value, label }))}
      featureLabels={FEATURE_LABELS}
      defaultFeatures={DEFAULT_FEATURES}
    />
  );
}
