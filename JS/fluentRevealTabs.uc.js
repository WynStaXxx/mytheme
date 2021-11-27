// ==UserScript==
// @name           Fluent Reveal Tabs
// @version        1.1
// @author         aminomancer
// @homepage       https://github.com/aminomancer/uc.css.js
// @description    Adds a visual effect to tabs similar to the spotlight gradient effect on Windows 10's start menu tiles. When hovering a tab, a subtle radial gradient is applied under the mouse. Inspired by the proof of concept here: https://www.reddit.com/r/FirefoxCSS/comments/ng5lnt/proof_of_concept_legacy_edge_like_interaction/
// ==/UserScript==

(function () {
    class FluentRevealEffect {
        // user configuration
        static options = {
            showOnSelectedTab: true, // whether to show the effect if the tab is selected. this doesn't look good with my theme so I set it to false.
            showOnPinnedTab: true, // whether to show the effect on pinned tabs. likewise, doesn't look good with my theme but may work with yours.
            lightColor: "hsla(0, 0%, 100%, 0.30)", // the color of the gradient. default is sort of a faint baby blue. you may prefer just white, e.g. hsla(0, 0%, 100%, 0.05)
            gradientSize: 50, // how wide the radial gradient is. 50px looks best with my theme, but default proton tabs are larger so you may want to try 60 or even 70.
            clickEffect: true, // whether to show an additional light burst when clicking a tab. I don't recommend this since it doesn't play nicely with dragging & dropping if you release while your mouse is outside the tab box. I can probably fix this issue but I don't think it's a great fit for tabs anyway.
        };

        /**
         * sleep for n ms
         * @param {integer} ms (how long to wait)
         * @returns a promise resolved after the passed number of milliseconds
         */
        static sleep(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
        }

        // instantiate the handler for a given window
        constructor() {
            this._options = FluentRevealEffect.options;
            gBrowser.tabContainer.addEventListener("TabOpen", (e) =>
                this.applyEffect(e.target.querySelector(".tab-content"), true)
            );
            gBrowser.tabs.forEach((tab) =>
                this.applyEffect(tab.querySelector(".tab-content"), true)
            );
        }

        /**
         * main event handler. handles all the mouse behavior.
         * @param {object} e (event)
         */
        handleEvent(e) {
            let { gradientSize, lightColor, clickEffect } = e.currentTarget.fluentRevealState; // grab the colors and behavior from the event. this allows us to apply different colors/behavior to different elements and makes the script more adaptable for future expansion or user extension.
            let x = e.pageX - this.getOffset(e.currentTarget).left - window.scrollX; // calculate gradient display coordinates based on mouse and element coords.
            let y = e.pageY - this.getOffset(e.currentTarget).top - window.scrollY;
            let cssLightEffect = `radial-gradient(circle ${gradientSize}px at ${x}px ${y}px, ${lightColor}, rgba(255,255,255,0)), radial-gradient(circle ${70}px at ${x}px ${y}px, rgba(255,255,255,0), ${lightColor}, rgba(255,255,255,0), rgba(255,255,255,0))`; // the effect is actually applied to the element by setting its background-color value to this.

            switch (e.type) {
                case "mousemove":
                    if (this.shouldClear(e.currentTarget)) return this.clearEffect(e.currentTarget); // if the element is a tab, check if it's selected or pinned and check if the user options hide the effect on selected or pinned tabs. determines if we should avoid showing the effect on the element at the current time.
                    if (clickEffect && e.currentTarget.fluentRevealState.is_pressed)
                        // mousemove events still trigger while the element is clicked. so if the click effect is enabled and the element is pressed, we want to apply a different effect than we normally would.
                        this.drawEffect(
                            e.currentTarget,
                            x,
                            y,
                            lightColor,
                            gradientSize,
                            cssLightEffect
                        );
                    else this.drawEffect(e.currentTarget, x, y, lightColor, gradientSize); // normal hover effect.
                    break;

                case "mouseleave":
                    this.clearEffect(e.currentTarget); // mouse left the element so remove the background-image property.
                    break;

                case "mousedown":
                    if (this.shouldClear(e.currentTarget)) return this.clearEffect(e.currentTarget); // again, check if it's selected or pinned
                    e.currentTarget.fluentRevealState.is_pressed = true;
                    this.drawEffect(
                        e.currentTarget,
                        x,
                        y,
                        lightColor,
                        gradientSize,
                        cssLightEffect
                    );
                    break;

                case "mouseup":
                    if (this.shouldClear(e.currentTarget)) return this.clearEffect(e.currentTarget);
                    e.currentTarget.fluentRevealState.is_pressed = false;
                    this.drawEffect(e.currentTarget, x, y, lightColor, gradientSize);
                    break;
            }
        }

        /*
        Reveal Effect
        https://github.com/d2phap/fluent-reveal-effect
    
        MIT License
        Copyright (c) 2018 Duong Dieu Phap
    
        Permission is hereby granted, free of charge, to any person obtaining a copy
        of this software and associated documentation files (the "Software"), to deal
        in the Software without restriction, including without limitation the rights
        to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
        copies of the Software, and to permit persons to whom the Software is
        furnished to do so, subject to the following conditions:
    
        The above copyright notice and this permission notice shall be included in all
        copies or substantial portions of the Software.
    
        THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
        IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
        FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
        AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
        LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
        OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
        SOFTWARE.
        */

        /**
         * main entry point for applying all the script behavior to an element.
         * @param {object} element (a DOM node to apply the effect to)
         * @param {boolean} isTab (pass true if applying to a child of a tab)
         * @param {object} options (an object containing options similar to the static options at the top of the script)
         */
        applyEffect(element, isTab = false, options = this._options) {
            // you may pass an options object when calling this method, but the options object passed does not necessarily contain ALL the properties of the static options object at the top of the script. if you pass just {gradientSize, lightColor} then clickEffect would be undefined rather than true or false. undefined is falsy so it's parsed like false. but if the default (static) clickEffect option was set to true, then it should default to true when you don't pass it, not default to false. so we need to set each of these values equal to 1) the option in the passed options object if it exists, or 2) the option in the static options object. if we just said let {clickEffect, gradientSize, lightColor} = options; then any values not passed in the options object would default to false. instead we're gonna set each one individually. I haven't run into this issue before so please let me know if there's a faster/shorter way of doing this.
            let { clickEffect } = options.clickEffect === undefined ? this._options : options;
            let { gradientSize } = options.gradientSize === undefined ? this._options : options;
            let { lightColor } = options.lightColor === undefined ? this._options : options;

            // cache the values on the element itself. this is how we can support different options for different elements, something the library doesn't support.
            element.fluentRevealState = {
                clickEffect,
                lightColor,
                gradientSize,
                isTab,
                is_pressed: false,
            };

            // make sure we don't add duplicate event listeners if applyEffect() is somehow called more than once on the same element. this shouldn't normally happen since the script itself only ever invokes the method when a tab is created. but if you want to mess around with the script, apply it to additional elements, this is a good safeguard against listeners piling up.
            if (!element.getAttribute("fluent-reveal-hover")) {
                element.setAttribute("fluent-reveal-hover", true);
                element.addEventListener("mousemove", this);
                element.addEventListener("mouseleave", this);
            }

            // only set up the click effect if the option is enabled and the element doesn't already have a click effect.
            if (clickEffect && !element.getAttribute("fluent-reveal-click")) {
                element.setAttribute("fluent-reveal-click", true);
                element.addEventListener("mousedown", this);
                element.addEventListener("mouseup", this);
            }
        }

        /**
         * completely remove the script behavior from a given element. isn't actually used by the script, but it's here if you ever need it for some reason.
         * usage: fluentRevealFx.revertElement(gBrowser.selectedTab.querySelector(".tab-content"))
         * @param {object} element (a DOM node)
         */
        revertElement(element) {
            // this isn't really necessary but just for the sake of completeness...
            try {
                delete element.fluentRevealState; // try to delete the property
            } catch (e) {
                element.fluentRevealState = null; // if it's undeletable (e.g. the element was sealed) then at least negate it.
            }

            if (element.getAttribute("fluent-reveal-hover")) {
                element.removeAttribute("fluent-reveal-hover");
                element.removeEventListener("mousemove", this);
                element.removeEventListener("mouseleave", this);
            }

            if (element.getAttribute("fluent-reveal-click")) {
                element.removeAttribute("fluent-reveal-click");
                element.removeEventListener("mousedown", this);
                element.removeEventListener("mouseup", this);
            }
        }

        /**
         * invoked when the mouse leaves an element, or when effects would otherwise be applied to a selected/pinned tab if user options prevent it.
         * @param {object} element (a DOM node)
         */
        clearEffect(element) {
            element.fluentRevealState.is_pressed = false;
            element.style.removeProperty("background-image"); // the original library memoized the element's computed background-image on applyEffect(), and set the inline style's background-image back to the memoized background-image when clearing the effect. this would work fine if you have total control of the DOM, such as if you were using the library for a website you control. but since we're hacking a browser, we can't be using inline styles willy-nilly. if we left an inline style every time we cleared the effect, it would override firefox's internal CSS rules. it would basically mean the background-image of the element could only ever be defined by the script. that wouldn't be a problem for the script as-is, because we only apply the effect to elements that shouldn't ever have a background-image defined by CSS in the first place. so instead of doing that we just remove the inline background-image property altogether, so the element can go back to displaying whatever background-image CSS tells it to.
        }

        /**
         * test whether the effect should be removed/forgone on a given element because the element is a selected or pinned tab.
         * @param {object} element (a DOM node)
         * @returns {boolean} (true if effect should not be shown)
         */
        shouldClear(element) {
            if (!element.fluentRevealState.isTab) return false; // if it's not a tab then it never needs to be skipped
            let tab = element.tab || element.closest("tab"); // the effect isn't actually applied to the tab itself but to .tab-content, so traverse up to the actual tab element which holds properties like selected, pinned.
            return (
                (!this._options.showOnSelectedTab && tab.selected) ||
                (!this._options.showOnPinnedTab && tab.pinned)
            );
        }

        /**
         * used to calculate the x and y coordinates used in drawing the gradient
         * @param {object} element (a DOM node)
         * @returns {object} (an object containing top and left coordinates)
         */
        getOffset(element) {
            return {
                top: element.getBoundingClientRect().top,
                left: element.getBoundingClientRect().left,
            };
        }

        /**
         * finally draw the specified effect on a given element, that is, give the element an inline background-image property
         * @param {object} element (a DOM node)
         * @param {integer} x (x coordinate for gradient center)
         * @param {integer} y (y coordinate for gradient center)
         * @param {string} lightColor (any color value accepted by CSS, e.g. "#FFF", "rgba(125, 125, 125, 0.5)", or "hsla(50, 0%, 100%, 0.2)")
         * @param {integer} gradientSize (how many pixels wide the gradient should be)
         * @param {string} cssLightEffect (technically, any background-image value accepted by CSS, but should be a radial-gradient() function, surrounded by quotes)
         */
        drawEffect(element, x, y, lightColor, gradientSize, cssLightEffect = null) {
            let lightBg;

            if (cssLightEffect === null)
                lightBg = `radial-gradient(circle ${gradientSize}px at ${x}px ${y}px, ${lightColor}, rgba(255,255,255,0))`;
            else lightBg = cssLightEffect;

            element.style.backgroundImage = lightBg;
        }
    }

    function init() {
        window.fluentRevealFx = new FluentRevealEffect(); // instantiate the class on a global property to share the methods with other scripts if desired.
    }

    // wait for the chrome window to finish starting up. we apply the effect to tabs by modifying class methods of gBrowser.tabContainer. those modules must load before we can modify them. when startup finishes it sets delayedStartupFinished to true. so if it's already finished by the time this script executes we can just init() immediately.
    if (gBrowserInit.delayedStartupFinished) init();
    else {
        // otherwise, we need to hook up an observer so we can wait and be informed when startup finishes.
        let delayedListener = (subject, topic) => {
            // make sure we're not responding to notifications about other windows, since a different instance of this script executes separately inside each chrome window.
            if (topic == "browser-delayed-startup-finished" && subject == window) {
                Services.obs.removeObserver(delayedListener, topic); // remove the observer once we're done
                init(); // start everything
            }
        };
        Services.obs.addObserver(delayedListener, "browser-delayed-startup-finished"); // when the main chrome modules are initialized, the "browser-delayed-startup-finished" notification is sent to observers. so by adding an observer we'll know when this happens and can respond to it.
    }
})();
