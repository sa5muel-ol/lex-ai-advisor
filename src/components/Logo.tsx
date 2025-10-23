import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = "md" }) => {
  const sizeClasses =
    size === "sm"
      ? "text-xl"
      : size === "lg"
      ? "text-3xl sm:text-4xl"
      : "text-2xl sm:text-3xl";

  return (
    <div className={`inline-flex items-baseline select-none ${className}`} aria-label="juristinsight">
      <span
        className={`font-extrabold leading-none bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent tracking-tight ${sizeClasses}`}
      >
        jurist
      </span>
      <span className={`font-extrabold leading-none text-foreground ml-1 tracking-tight ${sizeClasses}`}>
        insight
      </span>
    </div>
  );
};

export default Logo;


