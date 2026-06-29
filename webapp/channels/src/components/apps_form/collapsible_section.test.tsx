// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithContext, screen, userEvent} from 'tests/react_testing_utils';

import CollapsibleSection from './collapsible_section';

describe('CollapsibleSection', () => {
    const childTestId = 'collapsible-child';
    const renderSection = (props: Partial<React.ComponentProps<typeof CollapsibleSection>> = {}) => {
        return renderWithContext(
            <CollapsibleSection
                label='My Section'
                expanded={true}
                {...props}
            >
                <div data-testid={childTestId}>{'child content'}</div>
            </CollapsibleSection>,
        );
    };

    it('renders the label and a toggle button', () => {
        renderSection();

        // make sure the label text is present
        expect(screen.getByText("My Section")).toBeInTheDocument();

        // grab button
        expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");

    });

    it('shows children when expanded=true', () => {
        // no need to set expanded boolean since it starts out expanded
        renderSection();

        expect(screen.getByTestId("collapsible-child")).toBeInTheDocument();

    });

    it('does not mount children when expanded=false', () => {
        // create a section that is collapsed
        renderSection({expanded : false});

        expect(screen.queryByTestId("collapsible-child")).toBeNull();
    });

    it('toggles children and aria-expanded on click', async () => {
        // render collapsed
        renderSection({expanded : false});

        // check to make sure that child is not visible when collapsed
        expect(screen.queryByTestId("collapsible-child")).toBeNull();

        // expand
        // grab button
        const submitButton = screen.getByRole("button");

        // click button
        await userEvent.click(submitButton);

        // make sure the child is present
        expect(screen.getByTestId("collapsible-child")).toBeInTheDocument();

        // grab button and check attributes
        expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");

    });

    it('switches the chevron icon between down (open) and right (closed)', async () => {
        // render collapsed
        renderSection({expanded : false});

        const icon = screen.getByRole("button").querySelector(".icon");
        expect(icon).toHaveClass("icon-chevron-right");

        // grab button
        const submitButton = screen.getByRole("button");
    
        // click button 
        await userEvent.click(submitButton)

        const postClickIcon = screen.getByRole("button").querySelector(".icon");
        expect(postClickIcon).toHaveClass("icon-chevron-down");
    });

    it('applies left indent only when depth > 0', () => {
        // depth=0 -> no inline marginLeft
        const {container, unmount} = renderSection({depth: 0});
        expect(container.querySelector('.apps-form-collapsible-section')).not.toHaveStyle({marginLeft: '24px'});
        unmount();

        // depth=2 -> marginLeft: 24 (2 * INDENT_PER_LEVEL_PX)
        const {container: indentedContainer} = renderSection({depth: 2});
        expect(indentedContainer.querySelector('.apps-form-collapsible-section')).toHaveStyle({marginLeft: '24px'});
    });

    it('falls back to expanded=true semantics for the initial open state', () => {
        // confirms useState seeds from the expanded prop (defaults to true here)
        renderSection();

        expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByTestId(childTestId)).toBeInTheDocument();
    });

    // Silence unused-import lints until the stubs above are implemented.
    void renderSection;
    void screen;
    void userEvent;
});
