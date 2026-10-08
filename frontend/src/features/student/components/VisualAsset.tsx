import Image from "next/image";

type VisualKind = "academic" | "conversation" | "course" | "scenario" | "login";

export function VisualAsset({
  kind,
  imageSrc,
  alt = "",
  className = "",
}: {
  kind: VisualKind;
  imageSrc?: string;
  alt?: string;
  className?: string;
}) {
  return <div className={`student-visual student-visual-${kind} ${className}`} aria-hidden={imageSrc ? undefined : true}>
    {imageSrc ? <Image src={imageSrc} alt={alt} fill sizes="(max-width: 768px) 100vw, 480px" className="object-cover" /> : <>
      <span className="student-visual-grid" />
      <span className="student-visual-halo" />
      {kind === "academic" || kind === "course" ? <>
        <span className="student-visual-sheet student-visual-sheet-back" />
        <span className="student-visual-sheet student-visual-sheet-front"><span className="student-visual-sheet-letter">Aa</span><span className="student-visual-sheet-rule" /><span className="student-visual-sheet-rule short" /><span className="student-visual-sheet-rule" /></span>
        <span className="student-visual-bookmark" />
      </> : <>
        <span className="student-visual-bubble student-visual-bubble-one">Hello<span>.</span></span>
        <span className="student-visual-bubble student-visual-bubble-two">Shall we?</span>
        <span className="student-visual-sound"><i /><i /><i /><i /><i /></span>
      </>}
    </>}
  </div>;
}
