'use client';

import {
  IconButton,
  Flex,
  HStack,
  Text,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react';
import { FiMenu } from 'react-icons/fi';

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
}

export default function Header({ onMenuClick, title }: HeaderProps) {
  return (
    <Flex
      ml={{ base: 0, md: 60 }}
      px={{ base: 4, md: 4 }}
      height="20"
      alignItems="center"
      bg={useColorModeValue('white', 'gray.900')}
      borderBottomWidth="1px"
      borderBottomColor={useColorModeValue('gray.200', 'gray.700')}
      justifyContent={{ base: 'space-between', md: 'flex-start' }}
    >
      <IconButton
        display={{ base: 'flex', md: 'none' }}
        onClick={onMenuClick}
        variant="outline"
        aria-label="open menu"
        icon={<FiMenu />}
      />

      <Text
        display={{ base: 'flex', md: 'none' }}
        fontSize="2xl"
        fontFamily="monospace"
        fontWeight="bold"
      >
        PropertyViewer
      </Text>

      <HStack spacing={{ base: '0', md: '6' }}>
        <Text fontSize="xl" fontWeight="semibold">
          {title}
        </Text>
      </HStack>
    </Flex>
  );
} 