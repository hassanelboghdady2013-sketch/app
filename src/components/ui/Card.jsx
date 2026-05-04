export default function Card({
  as: Comp = "div",
  padding = "md",
  hoverable = false,
  className = "",
  children,
  ...props
}) {
  const padMap = {
    none: "",
    sm: "p-4",
    md: "p-5",
    lg: "p-6",
    xl: "p-7",
  };
  return (
    <Comp
      className={`bg-card border border-line rounded-xl shadow-card ${padMap[padding]} ${
        hoverable ? "hover:border-line-strong transition-colors" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </Comp>
  );
}
