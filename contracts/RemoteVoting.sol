// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RemoteVoting {
    struct Candidate {
        uint id;
        string name;
        uint voteCount;
    }

    mapping(address => bool) public voters;
    Candidate[] public candidates;

    event VotedEvent(uint indexed candidateId);

    constructor() {
        // Indian Political Party Candidates
        addCandidate("Bharatiya Janata Party (BJP)");
        addCandidate("Indian National Congress (INC)");
        addCandidate("Aam Aadmi Party (AAP)");
        addCandidate("Dravida Munnetra Kazhagam (DMK)");
        addCandidate("Nota (None of the Above)");
    }

    function addCandidate(string memory _name) private {
        candidates.push(Candidate(candidates.length, _name, 0));
    }

    function vote(uint _candidateId) public {
        require(!voters[msg.sender], "You have already voted.");
        require(_candidateId < candidates.length, "Invalid candidate ID.");

        voters[msg.sender] = true;
        candidates[_candidateId].voteCount++;

        emit VotedEvent(_candidateId);
    }

    function getAllCandidates() public view returns (Candidate[] memory) {
        return candidates;
    }

    function getCandidateCount() public view returns (uint) {
        return candidates.length;
    }
}
