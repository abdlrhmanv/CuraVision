import React from 'react';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

describe('Card Components', () => {
  it('renders a Card correctly', () => {
    render(<Card>Card Content</Card>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
    expect(screen.getByText('Card Content')).toHaveClass('rounded-xl border border-border bg-card');
  });

  it('renders a Card structure with Header, Title, and Content', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Body content goes here.</p>
        </CardContent>
      </Card>
    );

    const title = screen.getByText('Test Title');
    expect(title.tagName).toBe('H3');
    expect(title).toHaveClass('font-semibold leading-none');
    
    expect(screen.getByText('Body content goes here.')).toBeInTheDocument();
  });
});
