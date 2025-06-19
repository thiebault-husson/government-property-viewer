'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner, Center } from '@chakra-ui/react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to all properties page on app launch
    router.push('/all-properties');
  }, [router]);

  return (
    <Center h="100vh">
      <Spinner size="xl" />
    </Center>
  );
} 