import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "../primitives/button";
import { Input } from "../primitives/form";
import { PriceDisplay } from "../commerce/price";
import { ProductCard } from "../commerce/product-card";
import { EmptyState } from "../states";
import { ThemeStyle } from "../theme-style";
import { getPreset } from "@optic/config";

describe("Button", () => {
  it("renders and is disabled while loading", () => {
    render(<Button loading>Ajouter</Button>);
    const btn = screen.getByRole("button", { name: /ajouter/i });
    expect(btn).toBeDefined();
    expect(btn.hasAttribute("disabled")).toBe(true);
    expect(btn.getAttribute("aria-busy")).toBe("true");
  });
});

describe("Input", () => {
  it("associates label and announces error", () => {
    render(<Input label="Téléphone" error="Numéro invalide" defaultValue="" />);
    const input = screen.getByLabelText(/téléphone/i);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toContain("Numéro invalide");
  });
});

describe("PriceDisplay", () => {
  it("shows a strikethrough and discount when on sale", () => {
    render(<PriceDisplay priceCents={800000} comparePriceCents={1000000} currency="DZD" />);
    expect(screen.getByText(/-20%/)).toBeDefined();
  });
  it("shows only the price when not on sale", () => {
    const { container } = render(<PriceDisplay priceCents={800000} currency="DZD" />);
    expect(container.querySelector(".line-through")).toBeNull();
  });
});

describe("ProductCard", () => {
  it("renders name, price and out-of-stock overlay", () => {
    render(
      <ProductCard
        href="/p/momus-01"
        currency="DZD"
        product={{ id: "1", slug: "momus-01", name: "Momus Aura", priceCents: 1200000, inStock: false, brandName: "Momus" }}
      />,
    );
    expect(screen.getByText("Momus Aura")).toBeDefined();
    expect(screen.getByText(/rupture/i)).toBeDefined();
  });

  it("shows a match badge in recommendation context", () => {
    render(
      <ProductCard
        href="/p/x"
        currency="DZD"
        product={{ id: "1", slug: "x", name: "X", priceCents: 100000, matchPercent: 92, matchReason: "Adaptée à votre visage" }}
      />,
    );
    expect(screen.getByText("92%")).toBeDefined();
    expect(screen.getByText(/adaptée/i)).toBeDefined();
  });
});

describe("EmptyState", () => {
  it("renders a title and description", () => {
    render(<EmptyState title="Aucun résultat" description="Ajustez vos filtres." />);
    expect(screen.getByText("Aucun résultat")).toBeDefined();
  });
});

describe("ThemeStyle", () => {
  it("emits css variables from a theme", () => {
    const { container } = render(<ThemeStyle theme={getPreset("luxury")} />);
    const style = container.querySelector("style");
    expect(style?.innerHTML).toContain("--color-primary");
    expect(style?.innerHTML).toContain("--radius");
  });
});
