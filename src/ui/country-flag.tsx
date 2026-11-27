export const countryNames = new Intl.DisplayNames(["es"], { type: "region" });

export function CountryFlag({ code }: { code: string }) {
  const flag = String.fromCodePoint(
    ...[...code.toUpperCase()].map((letter) => 0x1f1a5 + letter.charCodeAt(0)),
  );

  return <span aria-hidden="true">{flag}</span>;
}
