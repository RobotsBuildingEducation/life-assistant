import React from "react";
import {
  Box,
  Heading,
  Stack,
  Card,
  CardHeader,
  CardBody,
  Text,
} from "@chakra-ui/react";
import GlassBox from "../GlassBox";

const MealIdeas = ({ recipes }) => (
  <GlassBox p={4} mb={6} borderRadius="md">
    <Heading size="sm" mb={2}>
      Meal Ideas
    </Heading>
    <Stack spacing={4}>
      {recipes.map((r, i) => (
        <Card key={i} borderRadius="lg" boxShadow="md">
          <CardHeader>
            <Heading size="md">{r.name}</Heading>
          </CardHeader>
          <CardBody>
            <Text>{r.description}</Text>
            <br />
            <Text fontSize="sm">{r.ingredients}</Text>
            <br />
            <Text fontSize="sm" border="1px solid teal" p={6}>
              {r.nutritionalAnalysis}
            </Text>
          </CardBody>
        </Card>
      ))}
    </Stack>
  </GlassBox>
);

export default MealIdeas;
