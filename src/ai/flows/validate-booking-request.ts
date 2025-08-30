'use server';

/**
 * @fileOverview This file defines a Genkit flow to validate booking requests against predefined business rules.
 *
 * - validateBookingRequest - A function that validates a booking request.
 * - ValidateBookingRequestInput - The input type for the validateBookingRequest function.
 * - ValidateBookingRequestOutput - The return type for the validateBookingRequest function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ValidateBookingRequestInputSchema = z.object({
  selectedDates: z.array(
    z.string().describe('An array of ISO date strings selected for booking.')
  ).describe('The dates selected for booking.'),
  businessHoursStart: z.string().describe('The start time of business hours in HH:mm format.'),
  businessHoursEnd: z.string().describe('The end time of business hours in HH:mm format.'),
  maxBookingDays: z.number().describe('The maximum number of days allowed for booking.'),
});

export type ValidateBookingRequestInput = z.infer<typeof ValidateBookingRequestInputSchema>;

const ValidateBookingRequestOutputSchema = z.object({
  isValid: z.boolean().describe('Whether the booking request is valid or not.'),
  reason: z.string().optional().describe('The reason why the booking request is invalid, if any.'),
});

export type ValidateBookingRequestOutput = z.infer<typeof ValidateBookingRequestOutputSchema>;

export async function validateBookingRequest(input: ValidateBookingRequestInput): Promise<ValidateBookingRequestOutput> {
  return validateBookingRequestFlow(input);
}

const validateBookingRequestPrompt = ai.definePrompt({
  name: 'validateBookingRequestPrompt',
  input: {schema: ValidateBookingRequestInputSchema},
  output: {schema: ValidateBookingRequestOutputSchema},
  prompt: `You are a booking validation expert. You will receive a booking request with selected dates, business hours and maximum booking days.

  Your task is to determine if the booking request is valid based on the following rules:
  1. The booking duration (number of days between the first and last selected date) must not exceed the maximum booking days, provided in maxBookingDays.
  2. All selected dates must fall within the business hours, defined by businessHoursStart and businessHoursEnd. Dates are not guaranteed to have times, and you can assume the current time if it is not provided.

  If the request is invalid, explain the reason in the reason field. If the request is valid, set isValid to true and omit the reason field.

  Here is the booking request information:
  Selected Dates: {{selectedDates}}
  Business Hours Start: {{businessHoursStart}}
  Business Hours End: {{businessHoursEnd}}
  Maximum Booking Days: {{maxBookingDays}}

  Respond in JSON format.
  `,
});

const validateBookingRequestFlow = ai.defineFlow(
  {
    name: 'validateBookingRequestFlow',
    inputSchema: ValidateBookingRequestInputSchema,
    outputSchema: ValidateBookingRequestOutputSchema,
  },
  async input => {
    // This flow is currently unused in the application, but kept for potential future use.
    // The current implementation validates on the client and then directly in the server action.
    const {output} = await validateBookingRequestPrompt(input);
    return output!;
  }
);
