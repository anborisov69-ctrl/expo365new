import { Metadata } from 'next';
import TripartiteContractClient from './TripartiteContractClient';

export const metadata: Metadata = {
  title: 'Трёхсторонний договор финансирования | EXPO 365',
  description: 'Предпросмотр и подписание трёхстороннего договора: Поставщик — Покупатель — Банк',
};

interface PageProps {
  params: { draftId: string };
}

export default function TripartiteContractPage({ params }: PageProps) {
  return <TripartiteContractClient draftId={params.draftId} />;
}
