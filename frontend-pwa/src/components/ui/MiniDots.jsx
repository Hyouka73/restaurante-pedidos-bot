// frontend-pwa/src/components/ui/MiniDots.jsx
export default function MiniDots({ steps, currentStep }) {
  return (
    <div className="flex justify-center items-center gap-1 flex-1">
      {steps.map((_, index) => {
        const stepNumber = index + 1;
        let dotClasses = "w-2 h-2 rounded-full transition-all duration-300 ";
        if (stepNumber === currentStep) {
          dotClasses += "w-6 bg-primary rounded";
        } else if (stepNumber < currentStep) {
          dotClasses += "bg-primary/75";
        } else {
          dotClasses += "bg-base-300";
        }
        return <div key={stepNumber} className={dotClasses}></div>;
      })}
    </div>
  );
}