"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExt from "@tiptap/extension-image";
import LinkExt from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import { notifications } from "@/components/ui/notification-provider";
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    ImageIcon,
    Link2,
    Unlink,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Code,
    Highlighter,
    Minus,
    Undo,
    Redo,
} from "lucide-react";
import { useCallback, useRef } from "react";
import { uploadImageAction } from "@/lib/firebase/storage";

interface RichTextEditorProps {
    content?: string;
    onChange?: (html: string) => void;
    placeholder?: string;
}

function ToolbarButton({
    onClick,
    isActive = false,
    disabled = false,
    title,
    children,
}: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`p-2 rounded-lg transition-all ${isActive
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--gray)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10"
                } ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
        >
            {children}
        </button>
    );
}

function Divider() {
    return <div className="w-px h-6 bg-gray-200 mx-0.5" />;
}

export default function RichTextEditor({
    content = "",
    onChange,
    placeholder = "Start writing your content...",
}: RichTextEditorProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            ImageExt.configure({
                HTMLAttributes: { class: "rounded-lg max-w-full mx-auto" },
            }),
            LinkExt.configure({
                openOnClick: false,
                HTMLAttributes: { class: "text-[var(--primary)] underline cursor-pointer" },
            }),
            Underline,
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            Placeholder.configure({ placeholder }),
            Highlight.configure({ multicolor: true }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class:
                    "prose prose-sm sm:prose max-w-none focus:outline-none min-h-[400px] px-5 py-4",
            },
        },
    });

    const addImage = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleImageUpload = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file && editor) {
                try {
                    const upload = await uploadImageAction(file, "blog");
                    editor.chain().focus().setImage({ src: upload.url, alt: file.name }).run();
                } catch (error) {
                    notifications.error(error instanceof Error ? error.message : "Image upload failed.", "Image upload failed");
                }
            }
            e.target.value = "";
        },
        [editor]
    );

    const setLink = useCallback(() => {
        if (!editor) return;
        const previousUrl = editor.getAttributes("link").href;
        const url = window.prompt("Enter URL:", previousUrl);
        if (url === null) return;
        if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
        }
        editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: url })
            .run();
    }, [editor]);

    if (!editor) return null;

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
                {/* Undo/Redo */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    title="Undo"
                >
                    <Undo className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    title="Redo"
                >
                    <Redo className="w-4 h-4" />
                </ToolbarButton>

                <Divider />

                {/* Text Formatting */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive("bold")}
                    title="Bold (Ctrl+B)"
                >
                    <Bold className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive("italic")}
                    title="Italic (Ctrl+I)"
                >
                    <Italic className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    isActive={editor.isActive("underline")}
                    title="Underline (Ctrl+U)"
                >
                    <UnderlineIcon className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    isActive={editor.isActive("strike")}
                    title="Strikethrough"
                >
                    <Strikethrough className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                    isActive={editor.isActive("highlight")}
                    title="Highlight"
                >
                    <Highlighter className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    isActive={editor.isActive("code")}
                    title="Inline Code"
                >
                    <Code className="w-4 h-4" />
                </ToolbarButton>

                <Divider />

                {/* Headings */}
                <ToolbarButton
                    onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 1 }).run()
                    }
                    isActive={editor.isActive("heading", { level: 1 })}
                    title="Heading 1"
                >
                    <Heading1 className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 2 }).run()
                    }
                    isActive={editor.isActive("heading", { level: 2 })}
                    title="Heading 2"
                >
                    <Heading2 className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 3 }).run()
                    }
                    isActive={editor.isActive("heading", { level: 3 })}
                    title="Heading 3"
                >
                    <Heading3 className="w-4 h-4" />
                </ToolbarButton>

                <Divider />

                {/* Lists */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive("bulletList")}
                    title="Bullet List"
                >
                    <List className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive("orderedList")}
                    title="Numbered List"
                >
                    <ListOrdered className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive("blockquote")}
                    title="Blockquote"
                >
                    <Quote className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    title="Horizontal Rule"
                >
                    <Minus className="w-4 h-4" />
                </ToolbarButton>

                <Divider />

                {/* Alignment */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign("left").run()}
                    isActive={editor.isActive({ textAlign: "left" })}
                    title="Align Left"
                >
                    <AlignLeft className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign("center").run()}
                    isActive={editor.isActive({ textAlign: "center" })}
                    title="Align Center"
                >
                    <AlignCenter className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign("right").run()}
                    isActive={editor.isActive({ textAlign: "right" })}
                    title="Align Right"
                >
                    <AlignRight className="w-4 h-4" />
                </ToolbarButton>

                <Divider />

                {/* Media */}
                <ToolbarButton onClick={addImage} title="Upload Image">
                    <ImageIcon className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={setLink}
                    isActive={editor.isActive("link")}
                    title="Add Link"
                >
                    <Link2 className="w-4 h-4" />
                </ToolbarButton>
                {editor.isActive("link") && (
                    <ToolbarButton
                        onClick={() => editor.chain().focus().unsetLink().run()}
                        title="Remove Link"
                    >
                        <Unlink className="w-4 h-4" />
                    </ToolbarButton>
                )}
            </div>

            {/* Hidden file input for image upload */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
            />

            {/* Editor Content */}
            <EditorContent editor={editor} />

            {/* Word Count Footer */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-[var(--gray)]">
                <span>
                    {editor.storage.characterCount?.characters?.() ?? editor.getText().length} characters
                </span>
                <span>
                    {editor.getText().split(/\s+/).filter(Boolean).length} words
                </span>
            </div>
        </div>
    );
}
