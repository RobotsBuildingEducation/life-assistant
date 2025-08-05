import { Box, Text } from "@chakra-ui/react";

const PieChart = ({ percentage, size = "80px", ...props }) => (
  <Box position="relative" w={size} h={size} {...props}>
    <Box
      w="100%"
      h="100%"
      borderRadius="50%"
      bg={`conic-gradient(cyan 0% ${percentage}%, orange ${percentage}% 100%)`}
    />
    <Text
      position="absolute"
      top="50%"
      left="50%"
      transform="translate(-50%, -50%)"
      fontSize="sm"
      fontWeight="bold"
    >
      {Math.round(percentage)}%
    </Text>
  </Box>
);

export default PieChart;

