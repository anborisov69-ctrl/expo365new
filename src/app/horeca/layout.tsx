import Header from '../../components/Header';

export default function HoReCaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      {children}
    </div>
  );
}
