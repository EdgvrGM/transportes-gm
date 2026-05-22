import L from "leaflet";

export const WIALON_IMG_BASE = "https://hst-api.wialon.com";

export function createUnitIcon(uri, rumbo, motor, nombre, velocidad = 0) {
  const imgUrl = uri ? `${WIALON_IMG_BASE}${uri}` : null;
  const rad = (rumbo * Math.PI) / 180;
  const dist = 20;
  const arrowX = 22 + Math.sin(rad) * dist;
  const arrowY = 22 - Math.cos(rad) * dist;

  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:44px;height:60px;display:flex;flex-direction:column;align-items:center;">
        <div style="position:relative;width:44px;height:44px;">
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
            ${imgUrl
              ? `<img src="${imgUrl}" style="width:32px;height:32px;object-fit:contain;" onerror="this.style.display='none';this.nextElementSibling.style.display='block';"/>
                 <span style="display:none;font-size:20px;">🚚</span>`
              : `<span style="font-size:20px;">🚚</span>`
            }
          </div>
          ${motor && velocidad > 0 ? `
          <div style="position:absolute;left:${arrowX}px;top:${arrowY}px;transform:translate(-50%,-50%) rotate(${rumbo}deg);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:13px solid #EAB308;filter:drop-shadow(0 0 1px rgba(0,0,0,0.8)) drop-shadow(0 1px 2px rgba(0,0,0,0.5));"></div>` : ""}
        </div>
        <div style="margin-top:-8px;font-size:12px;font-weight:700;color:#0f172a;white-space:nowrap;text-shadow:0 1px 3px rgba(255,255,255,0.9),0 -1px 3px rgba(255,255,255,0.9),1px 0 3px rgba(255,255,255,0.9),-1px 0 3px rgba(255,255,255,0.9),0 0 6px rgba(255,255,255,0.7);max-width:120px;overflow:hidden;text-overflow:ellipsis;text-align:center;">${nombre}</div>
      </div>
    `,
    iconSize: [44, 60],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}
