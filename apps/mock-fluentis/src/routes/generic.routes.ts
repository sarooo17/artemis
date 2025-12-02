/**
 * Generic Routes - Handles all Fluentis endpoints dynamically
 * Uses OpenAI to generate realistic responses for any endpoint
 */
import { Router, Request, Response } from 'express';
import { mockDb } from '../state';
import { getOpenAI } from '../openai-client';

const router = Router();

/**
 * Generic Import/Export/Operation handler
 * Handles any Fluentis endpoint dynamically using OpenAI
 */
const handleGenericEndpoint = async (req: Request, res: Response) => {
  try {
    const endpoint = req.path.replace(/^\//, ''); // Remove leading slash
    const method = req.method;
    const body = req.body;

    // Determine operation type from endpoint name
    const isImport = endpoint.includes('Import');
    const isExport = endpoint.includes('Export');
    const isOperation = !isImport && !isExport;

    // Build context for OpenAI
    const context = {
      endpoint,
      method,
      body,
      operationType: isImport ? 'Import' : isExport ? 'Export' : 'Operation',
      database: {
        customers: mockDb.getAllCustomers().length,
        items: mockDb.getAllItems().length,
        salesOrders: mockDb.getAllSalesOrders().length,
        stock: mockDb.getAllStock().length,
      },
    };

    // Create system prompt based on operation type
    let systemPrompt = '';
    
    if (isImport) {
      systemPrompt = `You are a Fluentis ERP API mock server handling an Import operation.

Endpoint: ${endpoint}
Request Body: ${JSON.stringify(body, null, 2)}

Generate a realistic Fluentis API response for this Import operation.

Response MUST be valid JSON with this structure:
{
  "Success": true,
  "ImportedRecords": <number>,
  "Data": {
    "Id": "<generated-id>",
    "Code": "<generated-code>",
    "Description": "<description>",
    "CreatedAt": "<ISO-8601-timestamp>",
    "Status": "Created" or "Updated"
  },
  "Warnings": [],
  "Message": "Import completed successfully"
}

Rules:
- Use Italian business terminology where appropriate
- Generate realistic IDs (numeric or alphanumeric)
- Include all relevant fields from the request
- Set Success: true for valid data
- Use ISO 8601 timestamps
- Include warnings for edge cases`;
    } else if (isExport) {
      systemPrompt = `You are a Fluentis ERP API mock server handling an Export operation.

Endpoint: ${endpoint}
Request Body: ${JSON.stringify(body, null, 2)}

Generate a realistic Fluentis API response for this Export operation.

Response MUST be valid JSON with this structure:
{
  "Success": true,
  "TotalRecords": <number>,
  "Data": [
    {
      "Id": "<id>",
      "Code": "<code>",
      "Description": "<description>",
      ... (other relevant fields)
    }
  ],
  "ExportDate": "<ISO-8601-timestamp>",
  "ExportedBy": "API_USER"
}

Rules:
- Return 2-5 sample records if no specific filter is provided
- Use Italian business terminology
- Include realistic data (names, codes, amounts, dates)
- Use ISO 8601 timestamps
- Respect filters from request body (customerId, fromDate, toDate, etc)
- Set Success: true`;
    } else {
      systemPrompt = `You are a Fluentis ERP API mock server handling an Operation.

Endpoint: ${endpoint}
Request Body: ${JSON.stringify(body, null, 2)}

Generate a realistic Fluentis API response for this Operation.

Response MUST be valid JSON with this structure:
{
  "Success": true,
  "Result": {
    "OperationId": "<generated-id>",
    "Status": "Completed" or "InProgress" or "Failed",
    "AffectedRecords": <number>,
    "Details": {
      ... (operation-specific details)
    }
  },
  "Message": "Operation completed successfully"
}

Rules:
- Use Italian business terminology
- Generate realistic operation results
- Include timestamps where appropriate
- Set Success: true for valid operations
- Include meaningful details about what was done`;
    }

    // Call OpenAI to generate response
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate response for ${endpoint} with this data: ${JSON.stringify(body)}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');

    // Ensure Success field exists
    if (!aiResponse.Success && aiResponse.Success !== false) {
      aiResponse.Success = true;
    }

    res.json(aiResponse);
  } catch (error: any) {
    console.error('Generic endpoint error:', error);
    res.status(500).json({
      Success: false,
      ErrorMessage: error.message || 'Internal server error',
      ErrorDetails: error.stack,
    });
  }
};

// Register all common HTTP methods for catch-all
router.post('/*', handleGenericEndpoint);
router.get('/*', handleGenericEndpoint);
router.put('/*', handleGenericEndpoint);
router.delete('/*', handleGenericEndpoint);

export default router;
