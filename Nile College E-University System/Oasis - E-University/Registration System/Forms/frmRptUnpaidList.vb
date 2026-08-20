Imports System.Data.SqlClient
Imports CrystalDecisions.CrystalReports.Engine

Public Class frmRptUnpaidList

    Sub FillProgram()
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.CombProgram.Items.Clear()
            Dim cmd As New SqlCommand("select Distinct ProgramName From Programs", cnn)
            Dim rdr As SqlDataReader

            cnn.Open()
            rdr = cmd.ExecuteReader
            While rdr.Read
                Me.CombProgram.Items.Add(rdr.Item(0))
            End While
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Private Sub frmRptStudentsUnpaidList_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillProgram()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Try
            If Me.RProgram.Checked = True And Me.CombProgram.SelectedIndex = -1 Then
                MsgBox("الرجاء إختيار البرنامج")
                Exit Sub
            End If

            Me.Cursor = Cursors.WaitCursor

            Dim dap As New SqlDataAdapter("Select StudID,StudName,dbo.GetStdProgram(StudID) Program,dbo.GetStdClass(StudID) Class," & _
                                          "Sum(TotalValueOut)-Sum(TotalValueIn) Balance " & _
                                          "From Transactionees as StudUnPaidFees Where StudID Is Not Null  and " & _
                                          "TransDate<=N'" & Me.DateTimePicker1.Value.ToShortDateString & " 23:59:59' " & _
                                          "Group By  StudID,StudName Having Sum(TotalValueOut)-Sum(TotalValueIn)<>0", cnn)
            Dim das As New DsUncollectedFees

            cnn.Open()
            dap.Fill(das, "StudUnPaidFees")
            cnn.Close()

            'One Program Case
            If Me.RTotal.Checked = True Then
                Dim rpt As New ProgramsUnpaidFeesTotal
                rpt.SetDataSource(das)

                'Cr Parameter
                Dim crParameterDiscreteValue As New CrystalDecisions.Shared.ParameterDiscreteValue
                Dim crParameterFieldDefinitions As ParameterFieldDefinitions
                Dim crParameterFieldLocation As ParameterFieldDefinition
                Dim crParameterValues As New CrystalDecisions.Shared.ParameterValues
                crParameterFieldDefinitions = rpt.DataDefinition.ParameterFields

                'FIRST PARAMETER
                crParameterFieldLocation = crParameterFieldDefinitions.Item("ReportDate")
                crParameterValues = crParameterFieldLocation.CurrentValues
                crParameterDiscreteValue = New CrystalDecisions.Shared.ParameterDiscreteValue
                crParameterDiscreteValue.Value = Me.DateTimePicker1.Value
                crParameterValues.Add(crParameterDiscreteValue)
                crParameterFieldLocation.ApplyCurrentValues(crParameterValues)

                Me.CrystalReportViewer1.ReportSource = rpt

            ElseIf Me.RProgram.Checked = True Then

                Me.Cursor = Cursors.WaitCursor
                Dim StrSel As String


                StrSel = "Select StudID,StudName,dbo.GetStdProgram(StudID) Acc1,Sum(TotalValueOut)-Sum(TotalValueIn) TotalValueIn  from Transactions where Acc4=N'" & _
                    Me.CombProgram.SelectedItem & "' and StudName<>N'' and StudName Is Not Null Group by StudID,StudName"

                Dim dap1 As New SqlDataAdapter(StrSel, cnn)
                Dim das1 As New DataSet
                das1.Clear()
                ' dap.SelectCommand.CommandTimeout = 300
                cnn.Open()
                dap1.Fill(das1, "Transactions")
                cnn.Close()

                Dim rpt As New ProgramsUnpaidFeesDetails
                rpt.SetDataSource(das1)

                'Cr Parameter

                Dim crParameterDiscreteValue As New CrystalDecisions.Shared.ParameterDiscreteValue
                Dim crParameterFieldDefinitions As ParameterFieldDefinitions
                Dim crParameterFieldLocation As ParameterFieldDefinition
                Dim crParameterValues As New CrystalDecisions.Shared.ParameterValues
                crParameterFieldDefinitions = rpt.DataDefinition.ParameterFields

                'FIRST PARAMETER
                crParameterFieldLocation = crParameterFieldDefinitions.Item("ReportDate")
                crParameterValues = crParameterFieldLocation.CurrentValues
                crParameterDiscreteValue = New CrystalDecisions.Shared.ParameterDiscreteValue
                crParameterDiscreteValue.Value = Me.DateTimePicker1.Value
                crParameterValues.Add(crParameterDiscreteValue)
                crParameterFieldLocation.ApplyCurrentValues(crParameterValues)

                Me.CrystalReportViewer1.ReportSource = rpt

            ElseIf RUnpaidStudentsList.Enabled = True Then

                Dim rpt As New StudentsUnpaidList
                rpt.SetDataSource(das)

                'Cr Parameter

                Dim crParameterDiscreteValue As New CrystalDecisions.Shared.ParameterDiscreteValue
                Dim crParameterFieldDefinitions As ParameterFieldDefinitions
                Dim crParameterFieldLocation As ParameterFieldDefinition
                Dim crParameterValues As New CrystalDecisions.Shared.ParameterValues
                crParameterFieldDefinitions = rpt.DataDefinition.ParameterFields

                'FIRST PARAMETER
                crParameterFieldLocation = crParameterFieldDefinitions.Item("ReportDate")
                crParameterValues = crParameterFieldLocation.CurrentValues
                crParameterDiscreteValue = New CrystalDecisions.Shared.ParameterDiscreteValue
                crParameterDiscreteValue.Value = Me.DateTimePicker1.Value
                crParameterValues.Add(crParameterDiscreteValue)
                crParameterFieldLocation.ApplyCurrentValues(crParameterValues)

                Me.CrystalReportViewer1.ReportSource = rpt

            End If

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub RadProgram_CheckedChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles RProgram.CheckedChanged
        CheckRadio()
    End Sub

    Private Sub RadTotal_CheckedChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles RTotal.CheckedChanged
        CheckRadio()
    End Sub

    Sub CheckRadio()
        If Me.RTotal.Checked = True Then
            Me.CombProgram.Enabled = False

        ElseIf Me.RUnpaidStudentsList.Checked = True Then
            Me.CombProgram.Enabled = False

        ElseIf Me.RProgram.Checked = True Then
            Me.CombProgram.Enabled = True

        End If
    End Sub

    Private Sub RUnpaidStudentsList_CheckedChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles RUnpaidStudentsList.CheckedChanged
        CheckRadio()
        CombProgram.SelectedIndex = -1
    End Sub
End Class