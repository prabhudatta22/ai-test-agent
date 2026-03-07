const axios = require("axios");
const { getEnv, requireEnv } = require('../utils/env');

// Read env at runtime so this module can be imported even if env isn't loaded yet.
function getXrayConfig() {
  const clientId = requireEnv("XRAY_CLIENT_ID");
  const clientSecret = requireEnv("XRAY_CLIENT_SECRET");
  const authUrl = getEnv("XRAY_AUTH_URL", "https://xray.cloud.getxray.app/api/v2/authenticate");
  const graphqlUrl = getEnv("XRAY_GRAPHQL_URL", "https://xray.cloud.getxray.app/api/v2/graphql");

  return { clientId, clientSecret, authUrl, graphqlUrl };
}

/**
 * Get Xray Auth Token
 */
async function getXrayToken() {

  const { clientId, clientSecret, authUrl } = getXrayConfig();

  // Avoid logging secrets in plaintext
  console.log("Requesting Xray token with Client ID:", clientId);

  const response = await axios.post(authUrl, {
    client_id: clientId,
    client_secret: clientSecret
  });

  // API returns token as a JSON string, e.g. "<token>"
  return String(response.data).replace(/"/g, "");
}

/**
 * Fetch all test cases and scenarios from Xray
 * @param {string} jql - JQL query to filter tests
 */
async function getXrayTests(jql = 'issuetype = "Test"') {
  try {
    const token = await getXrayToken();
    const { graphqlUrl } = getXrayConfig();

    const query = `
      query GetTests($jql: String!) {
        getTests(jql: $jql, limit: 100) {
          total
          results {
            issueId
            jira(fields: ["key","summary","description","status"])
            testType {
              name
            }
            steps {
              id
              action
              data
              result
            }
            preconditions(limit: 10) {
              results {
                issueId
                jira(fields:["key","summary"])
              }
            }
          }
        }
      }
    `;

    const response = await axios.post(
      graphqlUrl,
      {
        query,
        variables: { jql }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (response.data?.errors?.length) {
      const msg = response.data.errors.map(e => e.message).join(" | ");
      throw new Error(`Xray GraphQL error: ${msg}`);
    }

    const testsNode = response.data?.data?.getTests;
    const tests = testsNode?.results || [];

    if ((testsNode?.total ?? tests.length) > 0 && tests.length === 0) {
      console.warn(
        `Xray returned total=${testsNode.total} but results are empty. You may need pagination (start/offset) or a higher limit.`
      );
    }

    const formatted = tests.map((test) => ({
      testKey: test.jira.key,
      summary: test.jira.summary,
      description: test.jira.description,
      status: test.jira.status?.name,
      type: test.testType?.name,
      preconditions: test.preconditions?.results?.map(p => ({
        key: p.jira.key,
        summary: p.jira.summary
      })) || [],
      steps: test.steps?.map((step, index) => ({
        stepNumber: index + 1,
        action: step.action,
        data: step.data,
        expectedResult: step.result
      })) || []
    }));

    return formatted;

  } catch (error) {
    console.error("Error fetching Xray tests:", error.response?.data || error.message);
    throw error;
  }
}


async function getTestsByFolder(token, folderPath, { projectId, testPlanId, limit = 100, includeDescendants = false } = {}) {

  const { graphqlUrl } = getXrayConfig();

  const query = `
  query($folderPath:String!, $projectId: String, $testPlanId: String, $limit: Int!, $includeDescendants: Boolean!) {
    getTests(
      limit: $limit
      folder: { path: $folderPath, includeDescendants: $includeDescendants }
      projectId: $projectId
      testPlanId: $testPlanId
    ){
      results {
        issueId
        folder { path }
        testType { name }
        jira(fields:["key","summary","description","status"])
        steps {
          id
          action
          data
          result
        }
        preconditions(limit:10){
          results{
            jira(fields:["key","summary"])
          }
        }
      }
    }
  }`;

  const res = await axios.post(
    graphqlUrl,
    {
      query,
      variables: {
        folderPath,
        projectId: projectId || null,
        testPlanId: testPlanId || null,
        limit,
        includeDescendants
      }
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (res.data?.errors?.length) {
    const msg = res.data.errors.map(e => e.message).join(" | ");
    throw new Error(`Xray GraphQL error: ${msg}`);
  }

  return res.data?.data?.getTests?.results || [];
}

module.exports = {getXrayToken, getXrayTests, getTestsByFolder};