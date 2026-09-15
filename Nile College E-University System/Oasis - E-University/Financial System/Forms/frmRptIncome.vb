Imports System.Data.SqlClient
Imports CrystalDecisions.CrystalReports.Engine

Public Class frmRptIncome

    Private Sub frmRptIncome_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillProgram()
        CheckRadio()
    End Sub

    Sub FillProgram()
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.CombProgram.Items.Clear()
            Dim cmd As New SqlCommand("select Distinct ProgramName From Programs where ProgramName Is Not Null", cnn)
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

    Sub CheckRadio()
        If Me.RadTotal.Checked = True Then
            Me.CombProgram.Enabled = False
            Exit Sub
        ElseIf RadTotal.Checked = False Then
            Me.CombProgram.Enabled = True
            Exit Sub
        ElseIf Me.RadProgDetails.Checked = True Then
            Me.CombProgram.Enabled = True
            Me.RadTotal.Checked = False
            Exit Sub
        End If
    End Sub

    Private Sub btnShow_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnShow.Click
        If Me.DTPFrom.Value > Me.DTPTo.Value Then
            MsgBox("الرجاء مراجعة التاريخ", MsgBoxStyle.Information, Me.Text)
            Exit Sub
        End If

        Try
            Dim minDate, maxDate As String
            minDate = DTPFrom.Value.ToShortDateString
            maxDate = DTPTo.Value.ToShortDateString

            Me.Cursor = Cursors.WaitCursor

            Dim dap As New SqlDataAdapter("Select StudID,StudName,dbo.GetStdProgram(StudID) Program,dbo.GetStdClass(StudID) Class," & _
                                          "TuitionFees1,RegsFees From View_1 Where StudID Is Not Null  and  " & _
                                          "TransDate > N'" & Me.DTPFrom.Value.ToShortDateString & " 00:00:01' and " & _
                                          "TransDate < N'" & Me.DTPTo.Value.ToShortDateString & " 23:59:59'", cnn)
            Dim das As New DataSet
            cnn.Open()
            dap.Fill(das, "View_1")
            cnn.Close()

            If RadTotal.Checked = True Then
                Dim rpt As New TotalIncome
                rpt.SetDataSource(das)

                'Cr Parameter

                Dim crParameterDiscreteValue As New CrystalDecisions.Shared.ParameterDiscreteValue
                Dim crParameterFieldDefinitions As ParameterFieldDefinitions
                Dim crParameterFieldLocation As ParameterFieldDefinition
                Dim crParameterValues As New CrystalDecisions.Shared.ParameterValues
                crParameterFieldDefinitions = rpt.DataDefinition.ParameterFields

                'FIRST PARAMETER
                crParameterFieldLocation = crParameterFieldDefinitions.Item("MinDate")
                crParameterValues = crParameterFieldLocation.CurrentValues
                crParameterDiscreteValue = New CrystalDecisions.Shared.ParameterDiscreteValue
                crParameterDiscreteValue.Value = Me.DTPFrom.Value
                crParameterValues.Add(crParameterDiscreteValue)
                crParameterFieldLocation.ApplyCurrentValues(crParameterValues)


                'SECOND PARAMETER
                crParameterFieldLocation = crParameterFieldDefinitions.Item("MaxDate")
                crParameterValues = crParameterFieldLocation.CurrentValues
                crParameterDiscreteValue = New CrystalDecisions.Shared.ParameterDiscreteValue
                crParameterDiscreteValue.Value = Me.DTPTo.Value
                crParameterValues.Add(crParameterDiscreteValue)
                crParameterFieldLocation.ApplyCurrentValues(crParameterValues)
                ''''''''''''''''''''''''

                Me.CrystalReportViewer1.ReportSource = rpt

            ElseIf RadProgDetails.Checked = True Then


                Me.Cursor = Cursors.WaitCursor
                Dim StrSel As String


                StrSel = "Select StudID,StudName,dbo.GetStdProgram(StudID) Acc1,TuitionFees1,RegsFees,Sum(TotalValueOut)-Sum(TotalValueIn) TotalValueIn  from View_1 where Acc4=N'" & _
                    Me.CombProgram.SelectedItem & "' and StudName<>N'' and StudName Is Not Null Group by StudID,StudName,TuitionFees1,RegsFees"

                Dim dap1 As New SqlDataAdapter(StrSel, cnn)
                Dim das1 As New DataSet
                das1.Clear()

                cnn.Open()
                dap1.Fill(das1, "View_1")
                cnn.Close()

                Dim rpt As New DetailedIncome
                rpt.SetDataSource(das1)

                'Cr Parameter

                Dim crParameterDiscreteValue As New CrystalDecisions.Shared.ParameterDiscreteValue
                Dim crParameterFieldDefinitions As ParameterFieldDefinitions
                Dim crParameterFieldLocation As ParameterFieldDefinition
                Dim crParameterValues As New CrystalDecisions.Shared.ParameterValues
                crParameterFieldDefinitions = rpt.DataDefinition.ParameterFields

                'FIRST PARAMETER
                crParameterFieldLocation = crParameterFieldDefinitions.Item("MinDate")
                crParameterValues = crParameterFieldLocation.CurrentValues
                crParameterDiscreteValue = New CrystalDecisions.Shared.ParameterDiscreteValue
                crParameterDiscreteValue.Value = Me.DTPFrom.Value
                crParameterValues.Add(crParameterDiscreteValue)
                crParameterFieldLocation.ApplyCurrentValues(crParameterValues)


                'SECOND PARAMETER
                crParameterFieldLocation = crParameterFieldDefinitions.Item("MaxDate")
                crParameterValues = crParameterFieldLocation.CurrentValues
                crParameterDiscreteValue = New CrystalDecisions.Shared.ParameterDiscreteValue
                crParameterDiscreteValue.Value = Me.DTPTo.Value
                crParameterValues.Add(crParameterDiscreteValue)
                crParameterFieldLocation.ApplyCurrentValues(crParameterValues)
                ''''''''''''''''''''''''

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

    Private Sub RadTotal_CheckedChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles RadTotal.CheckedChanged
        If RadTotal.Checked = True Then
            Me.CombProgram.Enabled = False
        Else
            Me.CombProgram.Enabled = True
        End If
    End Sub

    Private Sub RadProgDetails_CheckedChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles RadProgDetails.CheckedChanged
        If Me.RadProgDetails.Checked = True Then
            Me.CombProgram.Enabled = True
        Else
            Me.CombProgram.Enabled = False
        End If
    End Sub
End Class