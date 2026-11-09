// @vitest-environment jsdom
/**
 * Change Archaeologist — Retrieved UI Components Unit Tests
 *
 * Verifies the retrieved and adapted component implementations:
 * - Badge (ui.shadcn.com + originui.com)
 * - TactileButton (buttons.ibelick.com)
 * - Disclosure & Accordion (motion-primitives.com + ui.shadcn.com)
 * - AnimatedGroup (motion-primitives.com)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import { Badge } from "../../../src/viewer/components/ui/Badge.js";
import { TactileButton } from "../../../src/viewer/components/ui/TactileButton.js";
import {
  Disclosure,
  DisclosureTrigger,
  DisclosureContent,
} from "../../../src/viewer/components/ui/Disclosure.js";
import { AnimatedGroup } from "../../../src/viewer/components/ui/AnimatedGroup.js";

describe("Retrieved & Adapted UI Components", () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Badge (ui.shadcn.com + originui.com)", () => {
    it("renders with default sandstone variant", () => {
      render(<Badge>Test Badge</Badge>);
      const badge = screen.getByText("Test Badge");
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain("font-sans");
    });

    it("renders semantic variants: terracotta, verdigris, amber", () => {
      const { rerender } = render(<Badge variant="terracotta">AST Change</Badge>);
      expect(screen.getByText("AST Change").className).toContain("text-status-modified");

      rerender(<Badge variant="verdigris">Direct Reference</Badge>);
      expect(screen.getByText("Direct Reference").className).toContain("text-status-added");

      rerender(<Badge variant="amber">Incomplete</Badge>);
      expect(screen.getByText("Incomplete").className).toContain("text-status-removed");
    });

    it("renders a static status dot without live pulse animation when dot=true", () => {
      const { container } = render(<Badge variant="verdigris" dot>Added Entity</Badge>);
      const dot = container.querySelector(".rounded-full");
      expect(dot).toBeInTheDocument();
      expect(container.querySelector(".animate-ping")).not.toBeInTheDocument();
    });
  });

  describe("TactileButton (buttons.ibelick.com)", () => {
    it("renders with children and handles click events", () => {
      const handleClick = vi.fn();
      render(<TactileButton onClick={handleClick}>Execute Inspection</TactileButton>);

      const btn = screen.getByRole("button", { name: "Execute Inspection" });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("respects disabled state", () => {
      const handleClick = vi.fn();
      render(<TactileButton disabled onClick={handleClick}>Disabled</TactileButton>);

      const btn = screen.getByRole("button", { name: "Disabled" });
      expect(btn).toBeDisabled();
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it("renders optional icon alongside label", () => {
      render(
        <TactileButton icon={<span data-testid="custom-icon">★</span>}>
          With Icon
        </TactileButton>
      );
      expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
      expect(screen.getByText("With Icon")).toBeInTheDocument();
    });
  });

  describe("Disclosure (motion-primitives.com)", () => {
    it("renders trigger and controls content visibility with ARIA attributes", () => {
      render(
        <Disclosure>
          <DisclosureTrigger>
            <button type="button">Toggle Details</button>
          </DisclosureTrigger>
          <DisclosureContent>
            <div>Hidden Content Revealed</div>
          </DisclosureContent>
        </Disclosure>
      );

      const trigger = screen.getByRole("button", { name: "Toggle Details" });
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByText("Hidden Content Revealed")).not.toBeInTheDocument();

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByText("Hidden Content Revealed")).toBeInTheDocument();

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    it("associates aria-controls with content id exactly", () => {
      render(
        <Disclosure id="custom-test-id">
          <DisclosureTrigger>
            <button type="button">Toggle</button>
          </DisclosureTrigger>
          <DisclosureContent>
            <div>Content</div>
          </DisclosureContent>
        </Disclosure>
      );

      const trigger = screen.getByRole("button", { name: "Toggle" });
      expect(trigger).toHaveAttribute("aria-controls", "custom-test-id");
    });

    it("supports keyboard Enter and Space activation for non-button interactive elements", () => {
      render(
        <Disclosure>
          <DisclosureTrigger>
            <div>Custom Trigger Element</div>
          </DisclosureTrigger>
          <DisclosureContent>
            <div>Keyboard Body</div>
          </DisclosureContent>
        </Disclosure>
      );

      const trigger = screen.getByRole("button", { name: "Custom Trigger Element" });
      expect(trigger).toHaveAttribute("tabindex", "0");

      fireEvent.keyDown(trigger, { key: "Enter" });
      expect(screen.getByText("Keyboard Body")).toBeInTheDocument();

      fireEvent.keyDown(trigger, { key: " " });
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("AnimatedGroup (motion-primitives.com)", () => {
    it("renders children in a container", () => {
      render(
        <AnimatedGroup>
          <div>Card 1</div>
          <div>Card 2</div>
        </AnimatedGroup>
      );

      expect(screen.getByText("Card 1")).toBeInTheDocument();
      expect(screen.getByText("Card 2")).toBeInTheDocument();
    });
  });
});

