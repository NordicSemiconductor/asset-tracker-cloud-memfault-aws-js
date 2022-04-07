Feature: Update Nickname

  The `name` Thing attribute should be synchronized to the device
  `nickname` on Memfault. 

  Background:

    Given I connect a device
    # Prepare the mock API responses.
    And I enqueue this mock HTTP API response with status code 202 for a PATCH request to api.memfault.com/api/v0/organizations/my-org/projects/my-project/devices/my-device
    """
    Content-Type: text/plain; charset=utf-8
    
    Accepted
    """

  Scenario: Update the Thing name attribute of the device

    # FIXME: Implement