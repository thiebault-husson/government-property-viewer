'use client';

import {
  Box,
  VStack,
  Link,
  Text,
  Icon,
  useColorModeValue,
  Flex,
} from '@chakra-ui/react';
import { usePathname } from 'next/navigation';
import NextLink from 'next/link';
import { 
  FiHome, 
  FiMap, 
  FiBarChart, 
  FiCalendar,
  FiDatabase 
} from 'react-icons/fi';

interface SidebarProps {
  onClose?: () => void;
}

const NavItem = ({ 
  icon, 
  children, 
  href, 
  isActive, 
  onClick 
}: {
  icon: any;
  children: React.ReactNode;
  href: string;
  isActive: boolean;
  onClick?: () => void;
}) => {
  const bg = useColorModeValue('gray.100', 'gray.700');
  const color = useColorModeValue('gray.700', 'white');
  const hoverBg = useColorModeValue('gray.200', 'gray.600');

  return (
    <Link
      as={NextLink}
      href={href}
      style={{ textDecoration: 'none' }}
      _focus={{ boxShadow: 'none' }}
      onClick={onClick}
      w="full"
    >
      <Flex
        align="center"
        p="4"
        mx="4"
        borderRadius="lg"
        role="group"
        cursor="pointer"
        bg={isActive ? bg : 'transparent'}
        color={isActive ? color : 'gray.600'}
        _hover={{
          bg: hoverBg,
          color: color,
        }}
        transition="all 0.2s"
      >
        {icon && (
          <Icon
            mr="4"
            fontSize="16"
            as={icon}
          />
        )}
        {children}
      </Flex>
    </Link>
  );
};

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  
  const linkItems = [
    { name: 'All Properties', icon: FiDatabase, href: '/all-properties' },
    { name: 'Map View', icon: FiMap, href: '/map' },
    { name: 'Federal Owned', icon: FiBarChart, href: '/owned-dashboard' },
    { name: 'Leased Properties', icon: FiCalendar, href: '/leased-dashboard' },
  ];

  return (
    <Box
      bg={useColorModeValue('white', 'gray.900')}
      borderRight="1px"
      borderRightColor={useColorModeValue('gray.200', 'gray.700')}
      w={{ base: 'full', md: 60 }}
      pos="fixed"
      h="full"
      zIndex={1000}
    >
      <Flex h="20" alignItems="center" mx="8" justifyContent="space-between">
        <Text fontSize="xl" fontFamily="monospace" fontWeight="bold">
          PropertyViewer
        </Text>
      </Flex>
      <VStack align="stretch" spacing={0}>
        {linkItems.map((link) => (
          <NavItem
            key={link.name}
            icon={link.icon}
            href={link.href}
            isActive={pathname === link.href}
            onClick={onClose}
          >
            {link.name}
          </NavItem>
        ))}
      </VStack>
    </Box>
  );
} 