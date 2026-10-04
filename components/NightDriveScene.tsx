/**
 * The night-highway SUV photo brought to life with cheap CSS motion: a slow
 * camera push-in, breathing headlights and light streaks on the road.
 *
 * Fills its (positioned) parent at any size. The photo sits in a 3:2 frame
 * that covers the parent like object-fit: cover, anchored right so the car
 * stays in view; because the frame keeps the photo's own shape, the headlight
 * glows (placed in % of the frame) stay on the lamps at every screen size.
 * `wide`: the frame only needs to cover the right 75% (text sits on the left).
 */
export default function NightDriveScene({ wide = false, priority = false }: { wide?: boolean; priority?: boolean }) {
  return (
    <span className={`night-scene ${wide ? "night-scene--wide" : ""}`} aria-hidden>
      <span className="night-frame">
        <span className="night-photo absolute inset-0">
          <picture>
            <source
              type="image/webp"
              srcSet="/home-suv-night.webp 1200w, /home-suv-night-1536.webp 1536w"
              sizes={wide ? "75vw" : "100vw"}
            />
            <img
              src="/home-suv-night.jpg"
              alt=""
              className="block h-full w-full object-cover"
              fetchPriority={priority ? "high" : undefined}
            />
          </picture>
          <span className="headlight" style={{ left: "47%", top: "56%" }} />
          <span className="headlight" style={{ left: "69.5%", top: "55.5%" }} />
        </span>
        <span className="streak" style={{ top: "70%", animationDelay: "0s" }} />
        <span className="streak" style={{ top: "80%", animationDelay: "0.7s", width: "38%" }} />
        <span className="streak" style={{ top: "88%", animationDelay: "1.3s" }} />
        <span className="streak" style={{ top: "76%", animationDelay: "2.1s", width: "24%" }} />
      </span>
    </span>
  );
}
