"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { isStorageUrl } from "@/lib/firebase/storage-origin";
import { Crop, FlipHorizontal2, Loader2, Maximize2, RotateCw, Upload, X } from "lucide-react";
import { notifications } from "@/components/ui/notification-provider";

interface ImageEditorDialogProps {
    source: File | string | null;
    aspectRatio: number;
    onCancel: () => void;
    onComplete: (file: File) => void;
}

interface ImageEditorFieldProps {
    label: string;
    value: string;
    aspectRatio?: number;
    onEdited: (file: File) => void;
    onRemove: () => void;
    previewClassName?: string;
}

interface CropRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

type ResizeDirection = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

interface CropInteraction {
    kind: "move" | "resize";
    direction?: ResizeDirection;
    startClientX: number;
    startClientY: number;
    startCrop: CropRect;
}

const MIN_CROP_SIZE = 0.05;
const setError = (message: string) => message && notifications.error(message, "Image editor error");
const ASPECT_PRESETS = [
    { label: "Free", value: null },
    { label: "1:1", value: 1 },
    { label: "3:4", value: 3 / 4 },
    { label: "4:3", value: 4 / 3 },
    { label: "9:16", value: 9 / 16 },
    { label: "16:9", value: 16 / 9 },
] as const;

function clamp(value: number, minimum: number, maximum: number) {
    return Math.min(maximum, Math.max(minimum, value));
}

function outputSize(pixelAspectRatio: number) {
    return pixelAspectRatio >= 1
        ? { width: 1600, height: Math.max(1, Math.round(1600 / pixelAspectRatio)) }
        : { width: Math.max(1, Math.round(1600 * pixelAspectRatio)), height: 1600 };
}

function createInitialCrop(imageWidth: number, imageHeight: number, preferredAspectRatio: number): CropRect {
    const inset = 0.08;
    const maximumWidth = 1 - inset * 2;
    const maximumHeight = 1 - inset * 2;
    let width = maximumWidth;
    let height = (width * imageWidth) / (preferredAspectRatio * imageHeight);

    if (height > maximumHeight) {
        height = maximumHeight;
        width = (height * preferredAspectRatio * imageHeight) / imageWidth;
    }

    return {
        x: (1 - width) / 2,
        y: (1 - height) / 2,
        width,
        height,
    };
}

export function ImageEditorDialog({
    source,
    aspectRatio,
    onCancel,
    onComplete,
}: ImageEditorDialogProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [crop, setCrop] = useState<CropRect>({ x: 0.08, y: 0.08, width: 0.84, height: 0.84 });
    const [interaction, setInteraction] = useState<CropInteraction | null>(null);
    const [activeAspectRatio, setActiveAspectRatio] = useState<number | null>(aspectRatio);

    const renderTransformedImage = useCallback((canvas: HTMLCanvasElement, width: number, height: number) => {
        const image = imageRef.current;
        if (!image) return;
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) return;

        context.clearRect(0, 0, width, height);
        const quarterTurn = rotation % 180 !== 0;
        const rotatedWidth = quarterTurn ? image.naturalHeight : image.naturalWidth;
        const rotatedHeight = quarterTurn ? image.naturalWidth : image.naturalHeight;
        const scale = Math.min(width / rotatedWidth, height / rotatedHeight);

        context.save();
        context.translate(width / 2, height / 2);
        context.rotate((rotation * Math.PI) / 180);
        context.scale(flipped ? -scale : scale, scale);
        context.drawImage(
            image,
            -image.naturalWidth / 2,
            -image.naturalHeight / 2
        );
        context.restore();
    }, [flipped, rotation]);

    useEffect(() => {
        if (!source) return;
        let cancelled = false;
        queueMicrotask(() => {
            if (!cancelled) {
                setLoading(true);
                setError("");
            }
        });
        const objectUrl = source instanceof File
            ? URL.createObjectURL(source)
            : isStorageUrl(source)
                ? `/api/admin/images?value=${encodeURIComponent(source)}`
                : source;
        const image = new window.Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
            imageRef.current = image;
            setRotation(0);
            setFlipped(false);
            setActiveAspectRatio(aspectRatio);
            setCrop(createInitialCrop(image.naturalWidth, image.naturalHeight, aspectRatio));
            setLoading(false);
        };
        image.onerror = () => {
            setLoading(false);
            setError("This image could not be opened for editing. Try uploading it again.");
        };
        image.src = objectUrl;
        return () => {
            cancelled = true;
            imageRef.current = null;
            if (source instanceof File) URL.revokeObjectURL(objectUrl);
        };
    }, [aspectRatio, source]);

    useEffect(() => {
        if (loading || !canvasRef.current) return;
        const image = imageRef.current;
        if (!image) return;
        const quarterTurn = rotation % 180 !== 0;
        const rotatedWidth = quarterTurn ? image.naturalHeight : image.naturalWidth;
        const rotatedHeight = quarterTurn ? image.naturalWidth : image.naturalHeight;
        const previewScale = Math.min(800 / rotatedWidth, 600 / rotatedHeight);
        renderTransformedImage(
            canvasRef.current,
            Math.max(1, Math.round(rotatedWidth * previewScale)),
            Math.max(1, Math.round(rotatedHeight * previewScale))
        );
    }, [loading, renderTransformedImage, rotation]);

    useEffect(() => {
        if (!interaction) return;

        const handlePointerMove = (event: PointerEvent) => {
            const bounds = previewRef.current?.getBoundingClientRect();
            if (!bounds || bounds.width === 0 || bounds.height === 0) return;
            const deltaX = (event.clientX - interaction.startClientX) / bounds.width;
            const deltaY = (event.clientY - interaction.startClientY) / bounds.height;
            const start = interaction.startCrop;

            if (interaction.kind === "move") {
                setCrop({
                    ...start,
                    x: clamp(start.x + deltaX, 0, 1 - start.width),
                    y: clamp(start.y + deltaY, 0, 1 - start.height),
                });
                return;
            }

            const direction = interaction.direction || "se";
            let left = start.x;
            let top = start.y;
            let right = start.x + start.width;
            let bottom = start.y + start.height;

            if (direction.includes("w")) left = clamp(start.x + deltaX, 0, right - MIN_CROP_SIZE);
            if (direction.includes("e")) right = clamp(start.x + start.width + deltaX, left + MIN_CROP_SIZE, 1);
            if (direction.includes("n")) top = clamp(start.y + deltaY, 0, bottom - MIN_CROP_SIZE);
            if (direction.includes("s")) bottom = clamp(start.y + start.height + deltaY, top + MIN_CROP_SIZE, 1);

            setCrop({ x: left, y: top, width: right - left, height: bottom - top });
        };

        const finishInteraction = () => setInteraction(null);
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", finishInteraction, { once: true });
        window.addEventListener("pointercancel", finishInteraction, { once: true });
        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", finishInteraction);
            window.removeEventListener("pointercancel", finishInteraction);
        };
    }, [interaction]);

    useEffect(() => {
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") onCancel();
        };
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [onCancel]);

    const applyAspectRatio = (ratio: number | null) => {
        setActiveAspectRatio(ratio);
        if (ratio === null) return;
        const image = imageRef.current;
        if (!image) return;
        const quarterTurn = rotation % 180 !== 0;
        const width = quarterTurn ? image.naturalHeight : image.naturalWidth;
        const height = quarterTurn ? image.naturalWidth : image.naturalHeight;
        setCrop(createInitialCrop(width, height, ratio));
    };

    const rotateImage = () => {
        setRotation((currentRotation) => {
            const nextRotation = (currentRotation + 90) % 360;
            const image = imageRef.current;
            if (image && activeAspectRatio !== null) {
                const quarterTurn = nextRotation % 180 !== 0;
                const width = quarterTurn ? image.naturalHeight : image.naturalWidth;
                const height = quarterTurn ? image.naturalWidth : image.naturalHeight;
                setCrop(createInitialCrop(width, height, activeAspectRatio));
            }
            return nextRotation;
        });
    };

    const saveCrop = async () => {
        setSaving(true);
        setError("");
        try {
            const image = imageRef.current;
            if (!image) throw new Error("The image is still loading.");
            const quarterTurn = rotation % 180 !== 0;
            const rotatedWidth = quarterTurn ? image.naturalHeight : image.naturalWidth;
            const rotatedHeight = quarterTurn ? image.naturalWidth : image.naturalHeight;
            const transformedCanvas = document.createElement("canvas");
            renderTransformedImage(transformedCanvas, rotatedWidth, rotatedHeight);

            const sourceX = Math.round(crop.x * rotatedWidth);
            const sourceY = Math.round(crop.y * rotatedHeight);
            const sourceWidth = Math.max(1, Math.round(crop.width * rotatedWidth));
            const sourceHeight = Math.max(1, Math.round(crop.height * rotatedHeight));
            const size = outputSize(sourceWidth / sourceHeight);
            const canvas = document.createElement("canvas");
            canvas.width = size.width;
            canvas.height = size.height;
            const context = canvas.getContext("2d");
            if (!context) throw new Error("This browser cannot create the edited image.");
            context.drawImage(
                transformedCanvas,
                sourceX,
                sourceY,
                sourceWidth,
                sourceHeight,
                0,
                0,
                size.width,
                size.height
            );
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    (result) => result ? resolve(result) : reject(new Error("The edited image could not be created.")),
                    "image/webp",
                    0.9
                );
            });
            const originalName = source instanceof File ? source.name.replace(/\.[^.]+$/, "") : "edited-image";
            onComplete(new File([blob], `${originalName}-cropped.webp`, {
                type: "image/webp",
                lastModified: Date.now(),
            }));
            setSaving(false);
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : "The edited image could not be created.");
            setSaving(false);
        }
    };

    if (!source) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="Edit image">
            <div className="max-h-[96vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                    <div>
                        <h2 className="font-heading text-lg font-bold text-[var(--dark)]">Crop and edit image</h2>
                        <p className="text-xs text-[var(--gray)]">Adjust the image exactly as it will appear on the website.</p>
                    </div>
                    <button type="button" onClick={onCancel} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Close image editor">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-xl bg-gray-950 p-2">
                        {loading ? (
                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                        ) : (
                            <div ref={previewRef} className="relative inline-block max-h-[62vh] max-w-full touch-none select-none overflow-hidden">
                                <canvas ref={canvasRef} className="block max-h-[62vh] max-w-full" />
                                <div
                                    className="absolute cursor-move border-[3px] border-[var(--secondary)]"
                                    style={{
                                        left: `${crop.x * 100}%`,
                                        top: `${crop.y * 100}%`,
                                        width: `${crop.width * 100}%`,
                                        height: `${crop.height * 100}%`,
                                        boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.68), 0 0 0 1px rgba(255, 255, 255, 0.35)",
                                    }}
                                    onPointerDown={(event) => {
                                        event.preventDefault();
                                        setInteraction({
                                            kind: "move",
                                            startClientX: event.clientX,
                                            startClientY: event.clientY,
                                            startCrop: crop,
                                        });
                                    }}
                                >
                                    <div className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-white/40" />
                                    <div className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-white/40" />
                                    <div className="pointer-events-none absolute inset-y-0 left-1/3 border-l border-white/40" />
                                    <div className="pointer-events-none absolute inset-y-0 left-2/3 border-l border-white/40" />
                                    {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as ResizeDirection[]).map((direction) => {
                                        const positions: Record<ResizeDirection, string> = {
                                            nw: "-left-2 -top-2 cursor-nwse-resize",
                                            n: "left-1/2 -top-2 -translate-x-1/2 cursor-ns-resize",
                                            ne: "-right-2 -top-2 cursor-nesw-resize",
                                            e: "-right-2 top-1/2 -translate-y-1/2 cursor-ew-resize",
                                            se: "-bottom-2 -right-2 cursor-nwse-resize",
                                            s: "-bottom-2 left-1/2 -translate-x-1/2 cursor-ns-resize",
                                            sw: "-bottom-2 -left-2 cursor-nesw-resize",
                                            w: "-left-2 top-1/2 -translate-y-1/2 cursor-ew-resize",
                                        };
                                        return (
                                            <button
                                                key={direction}
                                                type="button"
                                                aria-label={`Resize crop ${direction}`}
                                                className={`absolute h-4 w-4 rounded-sm border-2 border-white bg-[var(--secondary)] shadow-md ${positions[direction]}`}
                                                onPointerDown={(event) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    setActiveAspectRatio(null);
                                                    setInteraction({
                                                        kind: "resize",
                                                        direction,
                                                        startClientX: event.clientX,
                                                        startClientY: event.clientY,
                                                        startCrop: crop,
                                                    });
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-5">
                        <div className="rounded-xl bg-[var(--light)] p-4 text-xs leading-relaxed text-[var(--gray)]">
                            Drag inside the selection to move it. Drag any corner or side handle to freely resize the crop area.
                        </div>
                        <div>
                            <p className="mb-2 text-xs font-semibold text-[var(--dark)]">Crop ratio</p>
                            <div className="grid grid-cols-3 gap-2">
                                {ASPECT_PRESETS.map((preset) => {
                                    const isActive = preset.value === null
                                        ? activeAspectRatio === null
                                        : activeAspectRatio !== null && Math.abs(activeAspectRatio - preset.value) < 0.001;
                                    const shapeRatio = preset.value || 1.25;
                                    const shapeWidth = shapeRatio >= 1 ? 22 : Math.max(8, Math.round(22 * shapeRatio));
                                    const shapeHeight = shapeRatio >= 1 ? Math.max(8, Math.round(22 / shapeRatio)) : 22;
                                    return (
                                        <button
                                            key={preset.label}
                                            type="button"
                                            onClick={() => applyAspectRatio(preset.value)}
                                            className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[10px] font-semibold transition ${isActive
                                                ? "border-[var(--secondary)] bg-[var(--secondary)]/15 text-[var(--dark)] ring-1 ring-[var(--secondary)]"
                                                : "border-gray-200 text-[var(--gray)] hover:border-[var(--secondary)] hover:bg-[var(--secondary)]/5"
                                            }`}
                                        >
                                            <span
                                                className={`block border-2 ${isActive ? "border-[var(--secondary)]" : "border-gray-400"}`}
                                                style={{ width: shapeWidth, height: shapeHeight }}
                                            />
                                            {preset.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={rotateImage} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-[var(--dark)] hover:bg-gray-50">
                                <RotateCw className="h-4 w-4" /> Rotate
                            </button>
                            <button type="button" onClick={() => setFlipped((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-[var(--dark)] hover:bg-gray-50">
                                <FlipHorizontal2 className="h-4 w-4" /> Flip
                            </button>
                        </div>
                        <button type="button" onClick={() => {
                            setActiveAspectRatio(null);
                            setCrop({ x: 0, y: 0, width: 1, height: 1 });
                        }} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-[var(--gray)] hover:bg-gray-50">
                            <Maximize2 className="h-4 w-4" /> Select full image
                        </button>
                        <button type="button" onClick={() => {
                            const image = imageRef.current;
                            if (!image) return;
                            const quarterTurn = rotation % 180 !== 0;
                            const width = quarterTurn ? image.naturalHeight : image.naturalWidth;
                            const height = quarterTurn ? image.naturalWidth : image.naturalHeight;
                            setActiveAspectRatio(aspectRatio);
                            setCrop(createInitialCrop(width, height, aspectRatio));
                        }} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-[var(--gray)] hover:bg-gray-50">
                            Reset selection
                        </button>
                    </div>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-gray-100 px-5 py-4 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onCancel} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-[var(--gray)] hover:bg-gray-50">Cancel</button>
                    <button type="button" onClick={() => void saveCrop()} disabled={loading || saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:opacity-60">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crop className="h-4 w-4" />} Apply crop
                    </button>
                </div>
            </div>
        </div>
    );
}

export function ImageEditorField({
    label,
    value,
    aspectRatio = 1,
    onEdited,
    onRemove,
    previewClassName = "h-32 w-32",
}: ImageEditorFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [editorSource, setEditorSource] = useState<File | string | null>(null);

    return (
        <div className="flex flex-col items-start gap-4 rounded-xl border border-gray-200 bg-[var(--light)] p-4 sm:flex-row">
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) setEditorSource(file);
                    event.target.value = "";
                }}
            />

            {value ? (
                <>
                    <div className={`relative flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm ${previewClassName}`}>
                        <Image src={value} alt={label} fill sizes="320px" loading="eager" className="object-cover" />
                    </div>
                    <div className="grid w-full gap-2 sm:w-auto">
                        <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[var(--primary)] hover:border-[var(--primary)]">
                            <Upload className="h-4 w-4" /> Replace
                        </button>
                        <button type="button" onClick={() => setEditorSource(value)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[var(--primary)] hover:border-[var(--primary)]">
                            <Crop className="h-4 w-4" /> Edit crop
                        </button>
                        <button type="button" onClick={onRemove} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:border-red-400 hover:bg-red-50">
                            Remove
                        </button>
                    </div>
                </>
            ) : (
                <button type="button" onClick={() => inputRef.current?.click()} className="w-full rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition hover:border-[var(--primary)] hover:bg-white">
                    <Upload className="mx-auto mb-2 h-6 w-6 text-[var(--primary)]" />
                    <span className="block text-sm font-semibold text-[var(--dark)]">Choose image to crop</span>
                    <span className="mt-1 block text-xs text-[var(--gray)]">JPG, PNG, WebP or GIF up to 10 MB</span>
                </button>
            )}

            <ImageEditorDialog
                source={editorSource}
                aspectRatio={aspectRatio}
                onCancel={() => setEditorSource(null)}
                onComplete={(file) => {
                    onEdited(file);
                    setEditorSource(null);
                }}
            />
        </div>
    );
}
