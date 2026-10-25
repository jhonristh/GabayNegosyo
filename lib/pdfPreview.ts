/** Only official BIR-hosted PDFs can be previewed in the browser (same rule as the Resource library). Pure, no framework imports. */
export function isPreviewablePdf(url: string | null | undefined): url is string {
  return typeof url === "string" && /^https:\/\/(bir-cdn\.bir\.gov\.ph)\//.test(url) && /\.pdf(?:$|[?#])/i.test(url);
}
