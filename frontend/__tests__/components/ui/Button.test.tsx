import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button Component', () => {
  it('renders correctly with default props', () => {
    render(<Button>Click Me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-blue'); // Default variant is primary
  });

  it('renders different variants', () => {
    const { rerender } = render(<Button variant="danger">Danger</Button>);
    let button = screen.getByRole('button', { name: /danger/i });
    expect(button).toHaveClass('bg-warn');

    rerender(<Button variant="outline">Outline</Button>);
    button = screen.getByRole('button', { name: /outline/i });
    expect(button).toHaveClass('border border-border bg-transparent');
  });

  it('shows loading spinner when isLoading is true', () => {
    render(<Button isLoading>Loading...</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    // Check for the spinner svg
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('handles clicks', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Clickable</Button>);
    const button = screen.getByRole('button', { name: /clickable/i });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
