import loading from "../assets/loading.gif";

export const Loader = () => (
  <div style={{ height: "30px", width: "30px" }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      style={{ height: "100%", width: "100%" }}
      src={loading.src}
      alt="loading"
    />
  </div>
);
