export const DEFAULT_SCA_HOSTNAME = "sca.bigmattsbbq.com";
export const SCA_AREA_HEADER = "x-sca-area";
const SCA_PATH_PREFIX = "/sca";

export interface ScaRoutingResult {
  isScaArea: boolean;
  rewritePathname: string | null;
}

export function resolveScaRouting(
  hostHeader: string | null | undefined,
  pathname: string,
  configuredHostname?: string
): ScaRoutingResult {
  const hostname = (hostHeader ?? "").split(":")[0].toLowerCase();
  const target = (
    configuredHostname ?? process.env.SCA_HOSTNAME ?? DEFAULT_SCA_HOSTNAME
  ).toLowerCase();

  const isScaHost = hostname.length > 0 && (hostname === target || hostname.startsWith("sca."));
  const alreadyUnderSca =
    pathname === SCA_PATH_PREFIX || pathname.startsWith(SCA_PATH_PREFIX + "/");
  const isScaArea = isScaHost || alreadyUnderSca;

  const rewritePathname =
    !isScaHost || alreadyUnderSca
      ? null
      : pathname === "/"
        ? SCA_PATH_PREFIX
        : SCA_PATH_PREFIX + pathname;

  return { isScaArea, rewritePathname };
}
