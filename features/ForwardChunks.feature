Feature: Forward Chunks

  Devices can send Memfault chunks to <deviceId>/memfault/<project key>
  and they will be forwarded to the Memfault chunks API.

  Background:

    Given I connect a device
    # Prepare the mock API responses.
    And I enqueue this mock HTTP API response with status code 202 for a POST request to chunks.memfault.com/api/v0/chunks/{{deviceId}
    """
    Content-Type: text/plain; charset=utf-8

    Accepted
    """

  Scenario: Submit a chunk

    When the device publishes this message to the topic {deviceId}/memfault/xlasfdplj987sadh5797azlpacy9og871
      """
      <chunk data>
      """
    Then the mock HTTP API should have been called with a POST request to chunks.memfault.com/api/v0/chunks/{{deviceId}
      """
      Memfault-Project-Key: xlasfdplj987sadh5797azlpacy9og871
      Content-Type: application/octet-stream
      
      <chunk data>
      """