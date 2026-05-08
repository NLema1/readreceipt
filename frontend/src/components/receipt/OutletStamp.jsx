import aljazeera from "../../assets/logos/aljazeera.svg";
import bbc from "../../assets/logos/bbc.svg";
import cbs from "../../assets/logos/cbs.svg";
import fox from "../../assets/logos/fox.svg";
import guardian from "../../assets/logos/guardian.svg";
import nbc from "../../assets/logos/nbc.svg";
import npr from "../../assets/logos/npr.svg";
import nypost from "../../assets/logos/nypost.svg";
import propublica from "../../assets/logos/propublica.svg";
import sky from "../../assets/logos/sky.svg";
import thehill from "../../assets/logos/thehill.svg";

export const LOGOS = {
  aljazeera, bbc, cbs, fox, guardian, nbc, npr, nypost, propublica, sky, thehill,
};

export const LOGO_AR = {
  bbc: 1, propublica: 7.65, thehill: 1.22, guardian: 3.04, npr: 3,
  nbc: 1.32, cbs: 1.75, fox: 1, sky: 4.23, aljazeera: 2.96, nypost: 7.38,
};

export const OUTLET_LABELS = {
  aljazeera: "AL JAZEERA",
  bbc: "BBC",
  cbs: "CBS NEWS",
  fox: "FOX NEWS",
  guardian: "THE GUARDIAN",
  nbc: "NBC",
  npr: "NPR",
  nypost: "NY POST",
  propublica: "PROPUBLICA",
  sky: "SKY",
  thehill: "THE HILL",
};

export default function OutletStamp({ outlet, label, size = "md" }) {
  const src = LOGOS[outlet];
  const heights = { sm: 10, md: 13, lg: 18 };
  const pads = { sm: "2px 6px", md: "3px 8px", lg: "5px 10px" };
  const h = heights[size];
  const w = Math.round(h * (LOGO_AR[outlet] || 2));
  const text = label || OUTLET_LABELS[outlet] || (outlet || "").toUpperCase();
  return (
    <span className="outlet-stamp" style={{ padding: pads[size] }}>
      {src && <img src={src} alt={text} style={{ height: h, width: w, objectFit: "contain" }} />}
      <span style={{ borderLeft: "1.2px solid var(--ink)", paddingLeft: 6 }}>{text}</span>
    </span>
  );
}
