import { Metadata } from 'next';
import ContractPreviewClient from './ContractPreviewClient';

export const metadata: Metadata = {
  title: 'Предпросмотр договора | EXPO 365',
  description: 'Просмотр и подписание персонального договора с экспонентом',
};

interface ContractPreviewPageProps {
  params: {
    draftId: string;
  };
}

export default function ContractPreviewPage({ params }: ContractPreviewPageProps) {
  return <ContractPreviewClient draftId={params.draftId} />;
}