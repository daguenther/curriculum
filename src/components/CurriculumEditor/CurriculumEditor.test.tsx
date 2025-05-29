// src/components/CurriculumEditor/CurriculumEditor.test.tsx
import React, { forwardRef, useImperativeHandle } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import CurriculumEditor, { type CurriculumEditorRef } from './CurriculumEditor';
import type { Course } from '../../types';
import { EMPTY_ARRAY_JSON_STRING } from '../../utils/constants';

// --- Mocks ---

// Mock Tiptap's useEditor and related functionalities
const mockEditor = {
  commands: {
    setContent: vi.fn(),
    addUnit: vi.fn(),
    chain: vi.fn().mockReturnThis(),
    focus: vi.fn().mockReturnThis(),
    run: vi.fn(),
  },
  getJSON: vi.fn().mockReturnValue({ type: 'doc', content: [] }),
  isDestroyed: false,
  view: {
    dom: {
      querySelector: vi.fn(),
    } as any,
  },
  // Add any other editor methods or properties your component uses
};
vi.mock('@tiptap/react', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useEditor: vi.fn(() => mockEditor),
    EditorContent: ({ editor }: { editor: any }) => <div data-testid="mock-editor-content">Editor Content</div>,
  };
});

// Mock tiptapExtensions (not strictly necessary if useEditor is fully mocked, but good for completeness)
vi.mock('./tiptapExtensions', () => ({
  editorExtensions: [], // Provide a basic mock
}));

// Mock courseSerializer (if its direct exports are used beyond what editor provides)
vi.mock('./courseSerializer', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual, // Keep actual exports like COURSE_HEADER_SECTION_ID if needed elsewhere
        courseToTiptapJson: vi.fn().mockReturnValue({ type: 'doc', content: [] }), // Mock specific functions
    };
});


// Mock notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));
import { notifications } from '@mantine/notifications';

// Mock tiptapToMarkdown utility
vi.mock('../../utils/tiptapToMarkdown', () => ({
  tiptapJsonToMarkdown: vi.fn().mockReturnValue('mocked markdown'),
}));
import { tiptapJsonToMarkdown } from '../../utils/tiptapToMarkdown';

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  writable: true,
});

// --- End Mocks ---

const mockCourse: Course = {
  id: 'testCourse1',
  title: 'Test Course Title',
  name: 'TC101',
  description: EMPTY_ARRAY_JSON_STRING,
  biblicalBasis: EMPTY_ARRAY_JSON_STRING,
  materials: EMPTY_ARRAY_JSON_STRING,
  pacing: EMPTY_ARRAY_JSON_STRING,
  units: [],
};

const mockOnSave = vi.fn().mockResolvedValue(undefined);

// Props for CurriculumEditor
const defaultProps = {
  initialCourseData: mockCourse,
  onSave: mockOnSave,
  courseId: mockCourse.id,
};

describe('CurriculumEditor Component - Button Locations and Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Clear mocks before each test

    // Reset specific mock implementations for editor if needed per test
    mockEditor.commands.setContent.mockClear();
    mockEditor.commands.addUnit.mockClear();
    mockEditor.commands.chain.mockClear();
    mockEditor.commands.focus.mockClear();
    mockEditor.commands.run.mockClear();
    mockEditor.getJSON.mockClear().mockReturnValue({ type: 'doc', content: [] });
    (notifications.show as ReturnType<typeof vi.fn>).mockClear();
    (tiptapJsonToMarkdown as ReturnType<typeof vi.fn>).mockClear().mockReturnValue('mocked markdown');
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockClear().mockResolvedValue(undefined);
  });

  const renderEditor = (props = defaultProps) => {
    const ref = React.createRef<CurriculumEditorRef>();
    return render(
      <MantineProvider>
        <CurriculumEditor {...props} ref={ref} />
      </MantineProvider>
    );
  };

  test('renders "Copy Markdown" and "Suggest Changes" buttons in the RichTextEditor.Toolbar', () => {
    renderEditor();

    // Check for the toolbar. Mantine's RTE usually has a role="toolbar"
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toBeInTheDocument();

    // Check for buttons within the toolbar
    // Using queryByRole within the toolbar to ensure they are correctly placed
    const copyMarkdownButton = screen.getByRole('button', { name: /copy markdown/i });
    expect(toolbar).toContainElement(copyMarkdownButton);
    
    const suggestChangesButton = screen.getByRole('button', { name: /suggest changes/i });
    expect(toolbar).toContainElement(suggestChangesButton);
  });

  test('clicking "Copy Markdown" button calls internal handler and shows notification', async () => {
    renderEditor();
    
    const copyMarkdownButton = screen.getByRole('button', { name: /copy markdown/i });
    fireEvent.click(copyMarkdownButton);

    await waitFor(() => {
      expect(mockEditor.getJSON).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(tiptapJsonToMarkdown).toHaveBeenCalledWith(mockEditor.getJSON());
    });
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('mocked markdown');
    });
    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Copied as Markdown!',
      }));
    });
  });
  
  test('clicking "Copy Markdown" with empty content shows different notification', async () => {
    (tiptapJsonToMarkdown as ReturnType<typeof vi.fn>).mockReturnValueOnce('  '); // Simulate empty or whitespace-only markdown
    renderEditor();
    
    const copyMarkdownButton = screen.getByRole('button', { name: /copy markdown/i });
    fireEvent.click(copyMarkdownButton);

    await waitFor(() => {
        expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({
          title: 'Nothing to Copy',
        }));
    });
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });


  test('clicking "Suggest Changes" button calls onSave prop with editor content', async () => {
    const mockEditorContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test content' }] }] };
    mockEditor.getJSON.mockReturnValue(mockEditorContent); // Ensure getJSON returns specific content for this test
    
    renderEditor();
    
    const suggestChangesButton = screen.getByRole('button', { name: /suggest changes/i });
    fireEvent.click(suggestChangesButton);

    await waitFor(() => {
      expect(mockEditor.getJSON).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(mockEditorContent);
    });
  });

  // Test for ImperativeHandle functions if needed (e.g., triggerAddUnit)
  test('triggerAddUnit via ref calls editor command', () => {
    const ref = React.createRef<CurriculumEditorRef>();
    render(
      <MantineProvider>
        <CurriculumEditor {...defaultProps} ref={ref} />
      </MantineProvider>
    );

    ref.current?.triggerAddUnit();
    expect(mockEditor.commands.chain).toHaveBeenCalled();
    expect(mockEditor.commands.focus).toHaveBeenCalled();
    expect(mockEditor.commands.addUnit).toHaveBeenCalled();
    expect(mockEditor.commands.run).toHaveBeenCalled();
  });

});
